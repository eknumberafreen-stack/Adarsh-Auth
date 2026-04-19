const express = require('express');
const crypto = require('crypto');
const AppUser = require('../models/AppUser');
const License = require('../models/License');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const { verifyClientRequest } = require('../middleware/clientAuth');
const { clientApiRateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Apply rate limiting to all client routes
router.use(clientApiRateLimiter);

/**
 * Initialize - Check if application is active
 * POST /api/client/init
 */
router.post('/init', verifyClientRequest, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Application is active',
    version: req.application.version
  });
}));

/**
 * Register new user with license key
 * POST /api/client/register
 */
router.post('/register', verifyClientRequest, asyncHandler(async (req, res) => {
  const { username, password, license_key, hwid } = req.clientData;

  // Validate license
  const license = await License.findOne({
    key: license_key,
    applicationId: req.application._id
  });

  if (!license || !license.isValid()) {
    await AuditLog.create({
      applicationId: req.application._id,
      action: 'register',
      ip: req.ip,
      severity: 'warning',
      details: { username, reason: 'invalid_license' }
    });
    return res.status(400).json({ error: 'Invalid or expired license' });
  }

  // Check if username already exists
  const existingUser = await AppUser.findOne({
    username,
    applicationId: req.application._id
  });

  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  // Calculate expiry date
  let expiryDate = null;
  if (license.expiryType === 'days' && license.expiryDays) {
    expiryDate = new Date(Date.now() + license.expiryDays * 24 * 60 * 60 * 1000);
  }

  // Create user
  const user = await AppUser.create({
    username,
    password,
    applicationId: req.application._id,
    hwid,
    expiryDate,
    lastLogin: Date.now(),
    lastIp: req.ip
  });

  // Mark license as used
  license.redeem(user._id, license.expiryDays);
  await license.save();

  // Create session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await Session.create({
    userId: user._id,
    applicationId: req.application._id,
    sessionToken,
    hwid,
    ip: req.ip,
    expiresAt: sessionExpiry
  });

  // Update application user count
  req.application.userCount = await AppUser.countDocuments({
    applicationId: req.application._id
  });
  await req.application.save();

  // Log success
  await AuditLog.create({
    applicationId: req.application._id,
    userId: user._id,
    action: 'register',
    ip: req.ip,
    severity: 'info'
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    sessionToken,
    expiryDate: user.expiryDate
  });
}));

/**
 * Login existing user
 * POST /api/client/login
 */
router.post('/login', verifyClientRequest, asyncHandler(async (req, res) => {
  const { username, password, hwid } = req.clientData;

  // Find user
  const user = await AppUser.findOne({
    username,
    applicationId: req.application._id
  });

  if (!user) {
    await AuditLog.create({
      applicationId: req.application._id,
      action: 'login_failed',
      ip: req.ip,
      severity: 'warning',
      details: { username, reason: 'user_not_found' }
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check if user is active
  if (!user.isActive()) {
    await AuditLog.create({
      applicationId: req.application._id,
      userId: user._id,
      action: 'login_failed',
      ip: req.ip,
      severity: 'warning',
      details: { username, reason: user.banned ? 'banned' : 'expired' }
    });
    return res.status(403).json({
      error: user.banned ? 'Account is banned' : 'Account has expired'
    });
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await AuditLog.create({
      applicationId: req.application._id,
      userId: user._id,
      action: 'login_failed',
      ip: req.ip,
      severity: 'warning',
      details: { username, reason: 'invalid_password' }
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check HWID lock
  if (user.hwid && user.hwid !== hwid) {
    await AuditLog.create({
      applicationId: req.application._id,
      userId: user._id,
      action: 'hwid_mismatch',
      ip: req.ip,
      severity: 'critical',
      details: { username, expected: user.hwid, received: hwid }
    });
    return res.status(403).json({ error: 'HWID mismatch' });
  }

  // Set HWID if first login
  if (!user.hwid) {
    user.hwid = hwid;
  }

  // Update user
  user.lastLogin = Date.now();
  user.lastIp = req.ip;
  await user.save();

  // Create session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await Session.create({
    userId: user._id,
    applicationId: req.application._id,
    sessionToken,
    hwid,
    ip: req.ip,
    expiresAt: sessionExpiry
  });

  // Log success
  await AuditLog.create({
    applicationId: req.application._id,
    userId: user._id,
    action: 'login_success',
    ip: req.ip,
    severity: 'info'
  });

  res.json({
    success: true,
    message: 'Login successful',
    sessionToken,
    expiryDate: user.expiryDate
  });
}));

/**
 * Validate session
 * POST /api/client/validate
 */
router.post('/validate', verifyClientRequest, asyncHandler(async (req, res) => {
  const { session_token, hwid } = req.clientData;

  const session = await Session.findOne({
    sessionToken: session_token,
    applicationId: req.application._id
  }).populate('userId');

  if (!session || !session.isValid()) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Verify HWID
  if (session.hwid !== hwid) {
    await AuditLog.create({
      applicationId: req.application._id,
      userId: session.userId._id,
      action: 'hwid_mismatch',
      ip: req.ip,
      severity: 'critical',
      details: { expected: session.hwid, received: hwid }
    });
    return res.status(403).json({ error: 'HWID mismatch' });
  }

  // Check if user is still active
  if (!session.userId.isActive()) {
    await Session.deleteOne({ _id: session._id });
    return res.status(403).json({ error: 'Account is not active' });
  }

  res.json({
    success: true,
    message: 'Session is valid',
    expiryDate: session.userId.expiryDate
  });
}));

/**
 * Heartbeat - Keep session alive
 * POST /api/client/heartbeat
 */
router.post('/heartbeat', verifyClientRequest, asyncHandler(async (req, res) => {
  const { session_token, hwid } = req.clientData;

  const session = await Session.findOne({
    sessionToken: session_token,
    applicationId: req.application._id
  }).populate('userId');

  if (!session || !session.isValid()) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Verify HWID
  if (session.hwid !== hwid) {
    await AuditLog.create({
      applicationId: req.application._id,
      userId: session.userId._id,
      action: 'hwid_mismatch',
      ip: req.ip,
      severity: 'critical'
    });
    return res.status(403).json({ error: 'HWID mismatch' });
  }

  // Check if user is still active
  if (!session.userId.isActive()) {
    await Session.deleteOne({ _id: session._id });
    return res.status(403).json({ error: 'Account is not active' });
  }

  // Update heartbeat
  await session.updateHeartbeat();

  res.json({
    success: true,
    message: 'Heartbeat received'
  });
}));

module.exports = router;

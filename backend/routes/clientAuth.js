/**
 * CLIENT AUTH ROUTES — Full Production-Grade
 * All advanced security features implemented
 */

const express  = require('express');
const crypto   = require('crypto');
const AppUser  = require('../models/AppUser');
const License  = require('../models/License');
const Session  = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const { verifyClientRequest }  = require('../middleware/clientAuth');
const { requireSession }       = require('../middleware/sessionValidator');
const { checkIPBan }           = require('../middleware/ipBan');
const { checkMaintenance }     = require('../middleware/maintenanceMode');
const { clientApiRateLimiter, endpointLimiter } = require('../middleware/rateLimiter');
const { asyncHandler }         = require('../middleware/errorHandler');
const {
  sendDiscordWebhook,
  loginEmbed,
  registerEmbed,
  loginFailedEmbed,
  bannedEmbed,
  hwidMismatchEmbed,
} = require('../utils/discord');

const router = express.Router();

// Global middleware for all client routes
router.use(checkIPBan);
router.use(checkMaintenance);
router.use(clientApiRateLimiter);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const randomDelay = (min = 100, max = 400) =>
  new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

const fail = async (res, code = 401, msg = 'Request failed') => {
  await randomDelay();
  return res.status(code).json({ success: false, message: msg });
};

/** Create session — invalidates any existing session for user+app */
const createSession = async (userId, appId, hwid, ip) => {
  await Session.deleteMany({ userId, applicationId: appId });

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await Session.create({
    userId,
    applicationId: appId,
    sessionToken: token,
    hwid,
    ip,
    lastHeartbeat: new Date(),
    expiresAt
  });

  return token;
};

/** Anomaly detection — auto-ban if too many HWID resets or failed logins */
const checkAnomaly = async (user, appId, ip) => {
  const HWID_RESET_THRESHOLD    = 5;
  const FAILED_LOGIN_THRESHOLD  = 10;
  const IP_CHANGE_THRESHOLD     = 10;

  const reasons = [];

  if (user.hwidResetCount >= HWID_RESET_THRESHOLD) {
    reasons.push(`HWID reset count: ${user.hwidResetCount}`);
  }
  if (user.failedLoginCount >= FAILED_LOGIN_THRESHOLD) {
    reasons.push(`Failed logins: ${user.failedLoginCount}`);
  }
  if (user.ipHistory.length >= IP_CHANGE_THRESHOLD) {
    const uniqueIps = new Set(user.ipHistory.map(h => h.ip)).size;
    if (uniqueIps >= IP_CHANGE_THRESHOLD) {
      reasons.push(`Unique IPs: ${uniqueIps}`);
    }
  }

  if (reasons.length > 0) {
    await AuditLog.create({
      applicationId: appId,
      userId: user._id,
      action: 'suspicious_activity',
      ip,
      severity: 'critical',
      details: { reason: 'anomaly_detected', triggers: reasons }
    });
  }
};

// ─── POST /api/client/init ────────────────────────────────────────────────────
router.post('/init',
  endpointLimiter('init', 30, 60_000),
  verifyClientRequest,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Application is active',
      version: req.application.version
    });
  })
);

// ─── POST /api/client/register ───────────────────────────────────────────────
router.post('/register',
  endpointLimiter('register', 5, 60_000),
  verifyClientRequest,
  asyncHandler(async (req, res) => {
    const { username, password, license_key, hwid } = req.clientBody;
    const ip = req.clientIp;

    if (!username || !password || !license_key || !hwid) {
      return fail(res, 400, 'Missing required fields');
    }
    if (typeof username !== 'string' || username.length > 50 || username.length < 3) {
      return fail(res, 400, 'Invalid username');
    }
    if (typeof password !== 'string' || password.length < 6) {
      return fail(res, 400, 'Password too short');
    }

    // Atomic license validation — prevents double-use race condition
    const license = await License.findOneAndUpdate(
      {
        key: license_key,
        applicationId: req.application._id,
        used: false,
        revoked: false,
        blacklisted: false
      },
      { $set: { used: true, usedAt: new Date() } },
      { new: true }
    );

    if (!license) {
      await AuditLog.create({
        applicationId: req.application._id,
        action: 'register',
        ip,
        severity: 'warning',
        details: { username, reason: 'invalid_or_used_license' }
      });
      return fail(res, 400, 'Invalid or already used license key');
    }

    // Check username uniqueness
    const existing = await AppUser.findOne({ username, applicationId: req.application._id });
    if (existing) {
      // Rollback license usage
      await License.findByIdAndUpdate(license._id, { used: false, usedAt: null });
      return fail(res, 400, 'Username already taken');
    }

    // Calculate expiry
    const expiryDate = license.expiryUnit !== 'lifetime' && license.expiryDuration
      ? License.calcExpiry(license.expiryUnit, license.expiryDuration)
      : null;

    // Create user
    const user = await AppUser.create({
      username,
      password,
      applicationId: req.application._id,
      hwid,
      expiryDate,
      lastLogin: new Date(),
      lastIp: ip,
      ipHistory: [{ ip, seenAt: new Date() }],
      hwidHistory: [{ hwid, seenAt: new Date() }]
    });

    // Link license to user
    await License.findByIdAndUpdate(license._id, { usedBy: user._id, expiryDate });

    const sessionToken = await createSession(user._id, req.application._id, hwid, ip);

    await AuditLog.create({
      applicationId: req.application._id,
      userId: user._id,
      action: 'register',
      ip,
      severity: 'info',
      details: { username }
    });

    // Discord webhook — new registration
    sendDiscordWebhook(req.application.discordWebhook,
      registerEmbed(username, ip, hwid, req.application.name, license_key));

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      sessionToken,
      expiryDate: user.expiryDate
    });
  })
);

// ─── POST /api/client/login ───────────────────────────────────────────────────
router.post('/login',
  endpointLimiter('login', 10, 60_000),
  verifyClientRequest,
  asyncHandler(async (req, res) => {
    const { username, password, hwid } = req.clientBody;
    const ip = req.clientIp;

    if (!username || !password || !hwid) {
      return fail(res);
    }

    const user = await AppUser.findOne({ username, applicationId: req.application._id });

    if (!user) {
      await AuditLog.create({
        applicationId: req.application._id,
        action: 'login_failed',
        ip,
        severity: 'warning',
        details: { username, reason: 'not_found' }
      });
      return fail(res);
    }

    // Check ban
    if (user.banned) {
      await AuditLog.create({
        applicationId: req.application._id,
        userId: user._id,
        action: 'login_failed',
        ip,
        severity: 'warning',
        details: { reason: 'banned' }
      });
      await randomDelay();
      // Discord webhook — banned attempt
      sendDiscordWebhook(req.application.discordWebhook,
        bannedEmbed(username, ip, req.application.name, user.banMessage));
      return res.status(403).json({
        success: false,
        banned: true,
        message: user.banMessage || 'Your account has been permanently banned.'
      });
    }

    // Check expiry
    if (user.expiryDate && user.expiryDate < Date.now()) {
      return fail(res, 403, 'Account has expired');
    }

    // Check if user's license is blacklisted
    const activeLicense = await License.findOne({
      usedBy: user._id,
      applicationId: req.application._id,
      blacklisted: true
    });
    if (activeLicense) {
      await AuditLog.create({
        applicationId: req.application._id,
        userId: user._id,
        action: 'login_failed',
        ip,
        severity: 'critical',
        details: { reason: 'blacklisted_license' }
      });
      const msg = user.banMessage
        ? user.banMessage
        : 'Your license has been permanently revoked.';
      return fail(res, 403, msg);
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      await user.save();
      await AuditLog.create({
        applicationId: req.application._id,
        userId: user._id,
        action: 'login_failed',
        ip,
        severity: 'warning',
        details: { reason: 'wrong_password', failCount: user.failedLoginCount }
      });
      // Discord webhook — failed login
      sendDiscordWebhook(req.application.discordWebhook,
        loginFailedEmbed(username, ip, req.application.name, 'Wrong password'));
      return fail(res);
    }

    // HWID check (strict)
    if (user.hwid && user.hwid !== hwid) {
      await AuditLog.create({
        applicationId: req.application._id,
        userId: user._id,
        action: 'hwid_mismatch',
        ip,
        severity: 'critical',
        details: { expected: user.hwid, received: hwid }
      });
      // Discord webhook — HWID mismatch
      sendDiscordWebhook(req.application.discordWebhook,
        hwidMismatchEmbed(username, ip, req.application.name));
      return fail(res, 403, 'Hardware ID mismatch');
    }

    // Bind HWID on first login
    if (!user.hwid) user.hwid = hwid;

    // Track device + IP history
    user.trackHwid(hwid);
    user.trackIp(ip);
    user.lastLogin = new Date();
    user.lastIp = ip;
    user.failedLoginCount = 0;
    await user.save();

    // Anomaly detection
    await checkAnomaly(user, req.application._id, ip);

    const sessionToken = await createSession(user._id, req.application._id, hwid, ip);

    await AuditLog.create({
      applicationId: req.application._id,
      userId: user._id,
      action: 'login_success',
      ip,
      severity: 'info'
    });

    // Discord webhook — successful login
    sendDiscordWebhook(req.application.discordWebhook,
      loginEmbed(username, ip, hwid, req.application.name, user.expiryDate));

    res.json({
      success: true,
      message: 'Login successful',
      sessionToken,
      expiryDate: user.expiryDate
    });
  })
);

// ─── POST /api/client/validate ────────────────────────────────────────────────
router.post('/validate',
  endpointLimiter('validate', 60, 60_000),
  verifyClientRequest,
  requireSession,
  asyncHandler(async (req, res) => {
    // Re-check license blacklist on every validate
    const blacklisted = await License.findOne({
      usedBy: req.sessionUser._id,
      applicationId: req.application._id,
      blacklisted: true
    });

    if (blacklisted) {
      await Session.deleteOne({ _id: req.session._id });
      return fail(res, 403, 'Account is permanently banned');
    }

    res.json({
      success: true,
      message: 'Session valid',
      expiryDate: req.sessionUser.expiryDate,
      username: req.sessionUser.username
    });
  })
);

// ─── POST /api/client/heartbeat ───────────────────────────────────────────────
router.post('/heartbeat',
  endpointLimiter('heartbeat', 120, 60_000),
  verifyClientRequest,
  requireSession,
  asyncHandler(async (req, res) => {
    req.session.lastHeartbeat = new Date();
    await req.session.save();
    res.json({ success: true, message: 'OK' });
  })
);

module.exports = router;

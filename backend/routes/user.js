const express  = require('express');
const AppUser  = require('../models/AppUser');
const License  = require('../models/License');
const Session  = require('../models/Session');
const IPBan    = require('../models/IPBan');
const AuditLog = require('../models/AuditLog');
const Application = require('../models/Application');
const { verifyToken }    = require('../middleware/auth');
const { asyncHandler }   = require('../middleware/errorHandler');
const { getRedisClient } = require('../config/redis');
const { checkPlanLimit } = require('../middleware/planLimit');

const router = express.Router();
router.use(verifyToken);

// ─── Get all users for application ───────────────────────────────────────────
router.get('/application/:applicationId', asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.applicationId, userId: req.userId });
  if (!application) return res.status(404).json({ error: 'Application not found' });

  const users = await AppUser.find({ applicationId: req.params.applicationId })
    .select('-password')
    .sort({ createdAt: -1 });

  res.json({ users });
}));

// ─── Create user directly from dashboard ─────────────────────────────────────
router.post('/create',
  (req, res, next) => { req.params.id = req.body.applicationId; next(); },
  checkPlanLimit('usersPerApp'),
  asyncHandler(async (req, res) => {
  const { username, password, email, subscription, expiryDate, hwidAffected, applicationId } = req.body;

  if (!username || !password || !applicationId) {
    return res.status(400).json({ error: 'username, password and applicationId are required' });
  }

  const application = await Application.findOne({ _id: applicationId, userId: req.userId });
  if (!application) return res.status(404).json({ error: 'Application not found' });

  const existing = await AppUser.findOne({ username, applicationId });
  if (existing) return res.status(400).json({ error: 'Username already exists' });

  const user = await AppUser.create({
    username,
    password,
    email: email || null,
    subscription: subscription || 'default',
    applicationId,
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    hwidAffected: hwidAffected !== false
  });

  application.userCount = await AppUser.countDocuments({ applicationId });
  await application.save();

  res.status(201).json({ message: 'User created successfully', user });
}));

// ─── BAN (soft or permanent) ──────────────────────────────────────────────────
// softBan=true  → just sets banned=true, licenses NOT blacklisted → PC reset = access again
// softBan=false → blacklists ALL licenses → NEVER works again even after PC reset
router.post('/:id/ban', asyncHandler(async (req, res) => {
  const { reason = 'Manual ban', banIp = false, banMessage = '', softBan = false } = req.body;

  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // 1. Ban user
  user.banned     = true;
  user.bannedAt   = new Date();
  user.banReason  = reason;
  user.banMessage = banMessage || null;
  await user.save();

  let blacklistedCount = 0;

  // 2. Permanent ban → blacklist licenses (survives PC reset)
  //    Soft ban → skip (PC reset = access again)
  if (!softBan) {
    const licenses = await License.find({
      usedBy: user._id,
      applicationId: user.applicationId._id
    });
    for (const license of licenses) {
      license.blacklist(reason);
      await license.save();
    }
    blacklistedCount = licenses.length;
  }

  // 3. Kill all sessions
  await Session.deleteMany({ userId: user._id });

  // 4. Optionally ban IP
  if (banIp && user.lastIp) {
    await IPBan.findOneAndUpdate(
      { ip: user.lastIp },
      { ip: user.lastIp, reason: `User ban: ${reason}`, bannedBy: req.userId },
      { upsert: true, new: true }
    );
    const redis = getRedisClient();
    await redis.del(`ipban:${user.lastIp}`);
  }

  await AuditLog.create({
    applicationId: user.applicationId._id,
    userId: user._id,
    action: 'login_failed',
    ip: req.ip,
    severity: softBan ? 'warning' : 'critical',
    details: {
      event: softBan ? 'user_soft_banned' : 'user_permanent_banned',
      reason,
      licensesBlacklisted: blacklistedCount,
      ipBanned: banIp && !!user.lastIp
    }
  });

  res.json({
    message: softBan ? 'User soft banned (PC reset = access)' : 'User permanently banned',
    licensesBlacklisted: blacklistedCount,
    ipBanned: banIp && !!user.lastIp
  });
}));

// ─── Edit user ────────────────────────────────────────────────────────────────
router.patch('/:id/edit', asyncHandler(async (req, res) => {
  const { username, email, subscription, expiryDate } = req.body;
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (username) user.username = username;
  if (email !== undefined) user.email = email || null;
  if (subscription) user.subscription = subscription;
  if (expiryDate !== undefined) user.expiryDate = expiryDate ? new Date(expiryDate) : null;
  await user.save();
  res.json({ message: 'User updated', user });
}));

// ─── Pause user (set expiryDate to now) ───────────────────────────────────────
router.patch('/:id/pause', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  user.paused = true;
  user._pausedExpiry = user.expiryDate; // save original
  user.expiryDate = new Date(Date.now() - 1000); // expired = blocked
  await user.save();
  await Session.deleteMany({ userId: user._id });
  res.json({ message: 'User paused' });
}));

// ─── Unpause user ─────────────────────────────────────────────────────────────
router.patch('/:id/unpause', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  user.paused = false;
  user.expiryDate = null; // restore to no expiry (lifetime)
  await user.save();
  res.json({ message: 'User unpaused' });
}));

// ─── Unban user ───────────────────────────────────────────────────────────────
router.post('/:id/unban', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  user.banned    = false;
  user.bannedAt  = null;
  user.banReason = null;
  await user.save();

  res.json({ message: 'User unbanned successfully' });
}));

// ─── Reset HWID ───────────────────────────────────────────────────────────────
router.post('/:id/reset-hwid', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  await user.resetHwid();
  await Session.deleteMany({ userId: user._id });

  res.json({ message: 'HWID reset successfully' });
}));

// ─── Delete user ──────────────────────────────────────────────────────────────
router.delete('/:id', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  await Promise.all([
    AppUser.deleteOne({ _id: user._id }),
    Session.deleteMany({ userId: user._id })
  ]);

  res.json({ message: 'User deleted successfully' });
}));

// ─── IP Ban management ────────────────────────────────────────────────────────
router.get('/ip-bans', asyncHandler(async (req, res) => {
  const bans = await IPBan.find().sort({ createdAt: -1 });
  res.json({ bans });
}));

router.post('/ip-bans', asyncHandler(async (req, res) => {
  const { ip, reason } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP is required' });

  const ban = await IPBan.findOneAndUpdate(
    { ip },
    { ip, reason: reason || 'Manual ban', bannedBy: req.userId },
    { upsert: true, new: true }
  );

  const redis = getRedisClient();
  await redis.del(`ipban:${ip}`);

  res.json({ message: 'IP banned', ban });
}));

router.delete('/ip-bans/:ip', asyncHandler(async (req, res) => {
  await IPBan.deleteOne({ ip: req.params.ip });

  const redis = getRedisClient();
  await redis.del(`ipban:${req.params.ip}`);

  res.json({ message: 'IP ban removed' });
}));

module.exports = router;

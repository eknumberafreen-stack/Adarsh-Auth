/**
 * ADMIN ROUTES
 * Global kill switch, maintenance mode, platform config
 */

const express  = require('express');
const Config   = require('../models/Config');
const AuditLog = require('../models/AuditLog');
const User     = require('../models/User');
const { verifyToken }    = require('../middleware/auth');
const { asyncHandler }   = require('../middleware/errorHandler');
const { getRedisClient } = require('../config/redis');

const router = express.Router();
router.use(verifyToken);

// Get all config
router.get('/config', asyncHandler(async (req, res) => {
  const maintenance = await Config.get('MAINTENANCE_MODE', false);
  res.json({ MAINTENANCE_MODE: maintenance });
}));

// Toggle maintenance mode (global kill switch)
router.post('/config/maintenance', asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  await Config.set('MAINTENANCE_MODE', !!enabled);

  // Invalidate cache
  const redis = getRedisClient();
  await redis.del('config:maintenance_mode');

  res.json({
    message: `Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'}`,
    MAINTENANCE_MODE: !!enabled
  });
}));

// Get recent audit logs
router.get('/logs', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, severity, action } = req.query;
  const filter = {};
  if (severity) filter.severity = severity;
  if (action)   filter.action   = action;

  const logs = await AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

  const total = await AuditLog.countDocuments(filter);

  res.json({ logs, total, page: parseInt(page) });
}));

// Unlock a locked user account (requires auth)
router.post('/users/unlock', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await user.resetLoginAttempts();

  res.json({ message: `Account unlocked for ${email}` });
}));

module.exports = router;

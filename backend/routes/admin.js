/**
 * ADMIN ROUTES
 * Global kill switch, maintenance mode, platform config
 */

const express          = require('express');
const Config           = require('../models/Config');
const AuditLog         = require('../models/AuditLog');
const User             = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { verifyToken, verifyOwner } = require('../middleware/auth');
const { asyncHandler }   = require('../middleware/errorHandler');
const { getRedisClient } = require('../config/redis');

const router = express.Router();
router.use(verifyToken);
router.use(verifyOwner);

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

// Get all registered developers (dashboard accounts)
router.get('/developers', asyncHandler(async (req, res) => {
  const Application = require('../models/Application');

  const users = await User.find({})
    .select('email createdAt lastLogin googleId plan planAssignedAt')
    .populate('plan', 'name displayName')
    .sort({ createdAt: -1 })
    .lean();

  // Get app count per user
  const userIds = users.map(u => u._id);
  const apps = await Application.find({ userId: { $in: userIds } })
    .select('userId name status')
    .lean();

  const appCountMap = {};
  apps.forEach(app => {
    const id = app.userId.toString();
    appCountMap[id] = (appCountMap[id] || 0) + 1;
  });

  const result = users.map(u => ({
    _id: u._id,
    email: u.email,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
    loginMethod: u.googleId ? 'Google' : 'Email',
    appCount: appCountMap[u._id.toString()] || 0,
    plan: u.plan ? { _id: u.plan._id, name: u.plan.name, displayName: u.plan.displayName } : null,
    planAssignedAt: u.planAssignedAt,
  }));

  res.json({ developers: result, total: result.length });
}));

// Get all subscription plans with developer count per plan
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find({}).lean();

  const plansWithCount = await Promise.all(
    plans.map(async (plan) => {
      const developerCount = await User.countDocuments({ plan: plan._id });
      return { ...plan, developerCount };
    })
  );

  res.json({ plans: plansWithCount });
}));

// Update limit fields on a subscription plan
router.put('/plans/:id', asyncHandler(async (req, res) => {
  const { limits, displayName, price, features, isActive } = req.body;

  const updateFields = {};
  if (limits !== undefined) {
    if (limits.maxApplications !== undefined)  updateFields['limits.maxApplications']  = limits.maxApplications;
    if (limits.maxUsersPerApp !== undefined)   updateFields['limits.maxUsersPerApp']   = limits.maxUsersPerApp;
    if (limits.maxLicensesPerApp !== undefined) updateFields['limits.maxLicensesPerApp'] = limits.maxLicensesPerApp;
    if (limits.maxApiCallsPerDay !== undefined) updateFields['limits.maxApiCallsPerDay'] = limits.maxApiCallsPerDay;
  }
  if (displayName !== undefined) updateFields.displayName = displayName;
  if (price !== undefined)       updateFields.price       = price;
  if (features !== undefined)    updateFields.features    = features;
  if (isActive !== undefined)    updateFields.isActive    = isActive;

  const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  if (!updatedPlan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  res.json({ plan: updatedPlan });
}));

// Assign a plan to a developer
// Existing resources are preserved on downgrade — see requirements 8.1
router.patch('/developers/:id/plan', asyncHandler(async (req, res) => {
  const { planId } = req.body;

  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found or inactive' });
  }

  const developer = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { plan: plan._id, planAssignedAt: new Date() } },
    { new: true }
  ).populate('plan', 'name displayName');

  if (!developer) {
    return res.status(404).json({ error: 'Developer not found' });
  }

  res.json({
    _id: developer._id,
    email: developer.email,
    plan: developer.plan,
    planAssignedAt: developer.planAssignedAt,
  });
}));

module.exports = router;

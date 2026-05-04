const express = require('express');
const Application = require('../models/Application');
const AppUser = require('../models/AppUser');
const License = require('../models/License');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { verifyToken, verifyAppAccess } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkPlanLimit } = require('../middleware/planLimit');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all applications for user (Owner or Team Member)
router.get('/', asyncHandler(async (req, res) => {
  const applications = await Application.find({
    $or: [
      { userId: req.userId },
      { 'team.userId': req.userId }
    ]
  })
    .select('-appSecret')
    .sort({ createdAt: -1 });

  res.json({ applications });
}));

// Get single application with credentials
router.get('/:id', verifyAppAccess(), asyncHandler(async (req, res) => {
  // Populate team user details
  await req.application.populate('team.userId', 'email username');
  const application = req.application.toObject();

  // Flatten populated team data for frontend convenience
  if (application.team) {
    application.team = application.team.map(m => ({
      ...m,
      userEmail: m.userId?.email || 'Unknown',
      userName: m.userId?.username || null,
      userId: m.userId?._id || m.userId // keep the ID as a string
    }));
  }

  // Security: only owner and managers can see appSecret
  if (!req.isOwner && req.teamRole !== 'manager') {
    delete application.appSecret;
  }

  res.json({ application });
}));

// Create application
router.post('/', validate(schemas.createApplication), checkPlanLimit('applications'), asyncHandler(async (req, res) => {
  const { name, version } = req.body;

  // Generate secure credentials
  const credentials = Application.generateCredentials();

  const application = await Application.create({
    name,
    version: version || '1.0',
    ownerId: req.user.ownerId,
    appSecret: credentials.appSecret,
    userId: req.userId,
    team: [] // starts empty
  });

  res.status(201).json({
    message: 'Application created successfully',
    application
  });
}));

// Update application
router.patch('/:id', validate(schemas.updateApplication), verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const application = req.application;
  const oldName = application.name;
  const ownerId = application.ownerId;

  // Update allowed fields
  if (req.body.name) application.name = req.body.name;
  if (req.body.version) application.version = req.body.version;
  if (req.body.status) application.status = req.body.status;
  if (req.body.discordWebhook !== undefined) application.discordWebhook = req.body.discordWebhook;
  
  if (req.body.customMessages) {
    application.customMessages = {
      ...application.customMessages,
      ...req.body.customMessages
    };
  }

  await application.save();

  // Invalidate Redis cache for client authentication
  try {
    const { getRedisClient } = require('../config/redis');
    const redis = getRedisClient();
    
    // Invalidate old name cache
    await redis.del(`app:${ownerId}:${oldName}`);
    
    // Invalidate new name cache (if changed)
    if (req.body.name && req.body.name !== oldName) {
      await redis.del(`app:${ownerId}:${req.body.name}`);
    }
  } catch (err) {
    console.error('[application] Cache invalidation failed:', err.message);
  }

  res.json({
    message: 'Application updated successfully',
    application
  });
}));

// Regenerate app secret — invalidates ALL sessions
router.post('/:id/regenerate-secret', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const application = req.application;
  const { getRedisClient } = require('../config/redis');
  const redis = getRedisClient();

  // Regenerate secret
  const newSecret = application.regenerateSecret();
  await application.save();

  // Invalidate ALL active sessions for this application in Redis
  const sessionKeys = await redis.keys('sess:*');
  let deletedCount = 0;
  for (const key of sessionKeys) {
    const sess = await redis.hgetall(key);
    if (sess.applicationId === application._id.toString()) {
      await redis.del(key);
      deletedCount++;
    }
  }

  // Log the rotation
  await AuditLog.create({
    applicationId: application._id,
    action: 'suspicious_activity',
    ip: req.ip,
    severity: 'info',
    details: {
      event: 'secret_rotated',
      sessionsInvalidated: deletedCount
    }
  });

  res.json({
    message: `Secret regenerated. ${deletedCount} session(s) invalidated.`,
    appSecret: newSecret
  });
}));

// Test Discord webhook
router.post('/:id/test-webhook', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const application = req.application;

  const { webhookUrl } = req.body;
  if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl required' });

  const { sendDiscordWebhook } = require('../utils/discord');

  await sendDiscordWebhook(webhookUrl, {
    title: '🧪 Test Webhook',
    color: 0x5865F2,
    description: `Webhook is working correctly for **${application.name}**!`,
    fields: [
      { name: '✅ Status', value: 'Connected', inline: true },
      { name: '🏠 App',   value: application.name, inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'AdarshAuth • Test Event' },
  });

  res.json({ message: 'Test webhook sent!' });
}));

// Delete application (OWNER ONLY)
router.delete('/:id', verifyAppAccess(), asyncHandler(async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Only the application owner can delete it.' });
  }

  const application = req.application;

  const { getRedisClient } = require('../config/redis');
  const redis = getRedisClient();

  // Delete all related data
  await Promise.all([
    AppUser.deleteMany({ applicationId: application._id }),
    License.deleteMany({ applicationId: application._id }),
    // Delete Redis sessions
    (async () => {
      const keys = await redis.keys('sess:*');
      for (const key of keys) {
        const sess = await redis.hgetall(key);
        if (sess.applicationId === application._id.toString()) await redis.del(key);
      }
    })(),
    Application.deleteOne({ _id: application._id })
  ]);

  res.json({ message: 'Application deleted successfully' });
}));

// Get application statistics
router.get('/:id/stats', verifyAppAccess(), asyncHandler(async (req, res) => {
  const application = req.application;
  const { getRedisClient } = require('../config/redis');
  const redis = getRedisClient();

  // Count Redis sessions for this app
  let activeSessionCount = 0;
  const sessionKeys = await redis.keys('sess:*');
  for (const key of sessionKeys) {
    const sess = await redis.hgetall(key);
    if (sess.applicationId === application._id.toString()) activeSessionCount++;
  }

  const [userCount, licenseCount, usedLicenseCount] = await Promise.all([
    AppUser.countDocuments({ applicationId: application._id }),
    License.countDocuments({ applicationId: application._id }),
    License.countDocuments({ applicationId: application._id, used: true })
  ]);

  res.json({
    stats: {
      totalUsers: userCount,
      totalLicenses: licenseCount,
      usedLicenses: usedLicenseCount,
      activeSessions: activeSessionCount
    }
  });
}));

// --- TEAM MANAGEMENT ROUTES ---

// Add a team member
router.post('/:id/team', verifyAppAccess(), asyncHandler(async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Only the owner can manage the team.' });
  }

  // Block free plan users
  const owner = await User.findById(req.userId).populate('plan');
  const ownerPlan = owner?.plan || await SubscriptionPlan.findOne({ name: 'free' });
  if (!ownerPlan || ownerPlan.name === 'free') {
    return res.status(403).json({ error: 'Team Management is a paid feature. Please upgrade your plan to invite team members.' });
  }

  const { email, role, permissions } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Find user by email
  const userToAdd = await User.findOne({ email });
  
  if (!userToAdd) {
    return res.status(404).json({ error: 'User not found. They must register first.' });
  }

  if (userToAdd._id.toString() === req.userId.toString()) {
    return res.status(400).json({ error: 'You cannot add yourself to the team.' });
  }

  const application = req.application;
  
  // Check if already in team
  const existing = application.team.find(m => m.userId.toString() === userToAdd._id.toString());
  if (existing) {
    return res.status(400).json({ error: 'User is already in the team.' });
  }

  application.team.push({
    userId: userToAdd._id,
    role: role || 'reseller',
    permissions: permissions || ['manage_licenses']
  });

  await application.save();
  res.json({ message: 'Team member added successfully', team: application.team });
}));

// Remove team member
router.delete('/:id/team/:userId', verifyAppAccess(), asyncHandler(async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Only the owner can manage the team.' });
  }

  const application = req.application;
  application.team = application.team.filter(m => m.userId.toString() !== req.params.userId);
  
  await application.save();
  res.json({ message: 'Team member removed', team: application.team });
}));

// Update team member permissions/role
router.patch('/:id/team/:userId', verifyAppAccess(), asyncHandler(async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Only the owner can manage the team.' });
  }

  const application = req.application;
  const member = application.team.find(m => m.userId.toString() === req.params.userId);
  
  if (!member) return res.status(404).json({ error: 'Team member not found' });

  if (req.body.role) member.role = req.body.role;
  if (req.body.permissions) member.permissions = req.body.permissions;

  await application.save();
  res.json({ message: 'Team member updated', team: application.team });
}));

module.exports = router;

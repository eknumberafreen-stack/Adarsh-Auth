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

// Get all applications for user (Owner or Team Member) with pagination and search
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const skip = (page - 1) * limit;

  const filter = {
    $and: [
      {
        $or: [
          { userId: req.userId },
          {
            team: {
              $elemMatch: {
                userId: req.userId,
                $or: [
                  { expiresAt: null },
                  { expiresAt: { $gt: new Date() } }
                ]
              }
            }
          }
        ]
      }
    ]
  };

  if (search) {
    filter.$and.push({ name: { $regex: search, $options: 'i' } });
  }

  const [applicationsRaw, total] = await Promise.all([
    Application.find(filter)
      .select('-appSecret')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Application.countDocuments(filter)
  ]);

  const applications = applicationsRaw.map(appDoc => {
    const appObj = appDoc.toObject();
    const isOwner = appObj.userId.toString() === req.userId.toString();
    const teamMember = appObj.team?.find(m => m.userId.toString() === req.userId.toString());
    const hasManageSettings = isOwner || (
      teamMember && 
      (!teamMember.expiresAt || new Date(teamMember.expiresAt) > new Date()) && 
      teamMember.permissions.includes('manage_settings')
    );
    if (!hasManageSettings) {
      delete appObj.discordWebhook;
    }
    return appObj;
  });

  res.json({ 
    applications,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get single application with credentials
router.get('/:id', verifyAppAccess(), asyncHandler(async (req, res) => {
  // Populate team user details
  await req.application.populate([
    { path: 'team.userId', select: 'email username' },
    { path: 'team.addedBy', select: 'username' }
  ]);
  const application = req.application.toObject();

  // Flatten populated team data for frontend convenience
  if (application.team) {
    application.team = application.team.map(m => ({
      ...m,
      userEmail: m.userId?.email || 'Unknown',
      userName: m.userId?.username || null,
      userId: m.userId?._id || m.userId, // keep the ID as a string
      addedByName: m.addedBy?.username || 'Owner'
    }));
  }

  // Security: only owner and managers can see appSecret
  if (!req.isOwner && req.teamRole !== 'manager') {
    delete application.appSecret;
  }

  // Security: only show webhook to owners and users with manage_settings permission
  const hasManageSettings = req.isOwner || (application.team && application.team.some(m => {
    const mId = typeof m.userId === 'object' ? m.userId?._id?.toString() : m.userId?.toString();
    return mId === req.userId.toString() && m.permissions?.includes('manage_settings');
  }));

  if (!hasManageSettings) {
    delete application.discordWebhook;
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
  if (req.body.downloadUrl !== undefined) application.downloadUrl = req.body.downloadUrl;
  if (req.body.integrityCheck !== undefined) application.integrityCheck = req.body.integrityCheck;
  if (req.body.clientHash !== undefined) application.clientHash = req.body.clientHash;
  
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
    
    // Invalidate cache for BOTH old and new app names to be safe
    await redis.del(`app:${ownerId}:${oldName}`);
    if (req.body.name) {
      await redis.del(`app:${ownerId}:${req.body.name}`);
    }
    
    // Add a small delay to ensure DB consistency before next request
    await new Promise(r => setTimeout(r, 100));
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

  // Delete all related data in parallel
  await Promise.all([
    AppUser.deleteMany({ applicationId: application._id }),
    License.deleteMany({ applicationId: application._id }),
    AuditLog.deleteMany({ applicationId: application._id }),
    Session.deleteMany({ applicationId: application._id }),
    // Optimized Redis session cleanup
    (async () => {
      try {
        const keys = await redis.keys('sess:*');
        if (keys.length > 0) {
          for (const key of keys) {
            const sess = await redis.hgetall(key);
            if (sess && sess.applicationId === application._id.toString()) {
              await redis.del(key);
            }
          }
        }
      } catch (err) {
        console.error('[delete] Redis cleanup failed:', err.message);
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

  const { email, role, permissions, expiresAt } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Validate expiresAt if provided
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid expiration date' });
    if (d <= new Date()) return res.status(400).json({ error: 'Expiration date must be in the future' });
  }

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
    existing.role = role || existing.role;
    existing.permissions = permissions || existing.permissions;
    existing.expiresAt = expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existing.expiresAt;
    await application.save();
    return res.json({ message: 'Team member updated successfully', team: application.team });
  }

  application.team.push({
    userId: userToAdd._id,
    role: role || 'reseller',
    permissions: permissions || ['manage_licenses'],
    addedBy: req.userId,
    expiresAt: expiresAt ? new Date(expiresAt) : null
  });

  await application.save();
  res.json({ message: 'Team member added successfully', team: application.team });
}));

// Remove team member
router.delete('/:id/team/:userId', verifyAppAccess(), asyncHandler(async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Only the owner can manage the team.' });
  }

  const { all } = req.query;
  const userIdToRemove = req.params.userId;

  if (all === 'true') {
    // Remove the user from all applications owned by req.userId
    await Application.updateMany(
      { userId: req.userId },
      { $pull: { team: { userId: userIdToRemove } } }
    );
    
    // Fetch and return the updated team for the current application
    const updatedApplication = await Application.findById(req.application._id);
    res.json({ message: 'Team member removed from all applications', team: updatedApplication?.team || [] });
  } else {
    const application = req.application;
    application.team = application.team.filter(m => m.userId.toString() !== userIdToRemove);
    
    await application.save();
    res.json({ message: 'Team member removed', team: application.team });
  }
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
  if (req.body.expiresAt !== undefined) {
    if (req.body.expiresAt) {
      const d = new Date(req.body.expiresAt);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid expiration date' });
      if (d <= new Date()) return res.status(400).json({ error: 'Expiration date must be in the future' });
      member.expiresAt = d;
    } else {
      member.expiresAt = null;
    }
  }

  await application.save();
  res.json({ message: 'Team member updated', team: application.team });
}));

module.exports = router;

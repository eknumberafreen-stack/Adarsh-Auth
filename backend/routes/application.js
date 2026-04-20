const express = require('express');
const Application = require('../models/Application');
const AppUser = require('../models/AppUser');
const License = require('../models/License');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const { verifyToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all applications for user
router.get('/', asyncHandler(async (req, res) => {
  const applications = await Application.find({ userId: req.userId })
    .select('-appSecret')
    .sort({ createdAt: -1 });

  res.json({ applications });
}));

// Get single application with credentials
router.get('/:id', asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  res.json({ application });
}));

// Create application
router.post('/', validate(schemas.createApplication), asyncHandler(async (req, res) => {
  const { name, version } = req.body;

  // Generate secure credentials
  const credentials = Application.generateCredentials();

  const application = await Application.create({
    name,
    version: version || '1.0.0',
    ownerId: credentials.ownerId,
    appSecret: credentials.appSecret,
    userId: req.userId
  });

  res.status(201).json({
    message: 'Application created successfully',
    application
  });
}));

// Update application
router.patch('/:id', validate(schemas.updateApplication), asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  // Update allowed fields
  if (req.body.name) application.name = req.body.name;
  if (req.body.version) application.version = req.body.version;
  if (req.body.status) application.status = req.body.status;
  if (req.body.discordWebhook !== undefined) application.discordWebhook = req.body.discordWebhook;

  await application.save();

  res.json({
    message: 'Application updated successfully',
    application
  });
}));

// Regenerate app secret — invalidates ALL sessions (Fix #6)
router.post('/:id/regenerate-secret', asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  // Regenerate secret
  const newSecret = application.regenerateSecret();
  await application.save();

  // Invalidate ALL active sessions for this application
  const deleted = await Session.deleteMany({ applicationId: application._id });

  // Log the rotation
  await AuditLog.create({
    applicationId: application._id,
    action: 'suspicious_activity',
    ip: req.ip,
    severity: 'info',
    details: {
      event: 'secret_rotated',
      sessionsInvalidated: deleted.deletedCount
    }
  });

  res.json({
    message: `Secret regenerated. ${deleted.deletedCount} session(s) invalidated.`,
    appSecret: newSecret
  });
}));

// Test Discord webhook
router.post('/:id/test-webhook', asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!application) return res.status(404).json({ error: 'Application not found' });

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

// Delete application
router.delete('/:id', asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  // Delete all related data
  await Promise.all([
    AppUser.deleteMany({ applicationId: application._id }),
    License.deleteMany({ applicationId: application._id }),
    Session.deleteMany({ applicationId: application._id }),
    Application.deleteOne({ _id: application._id })
  ]);

  res.json({ message: 'Application deleted successfully' });
}));

// Get application statistics
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const [userCount, licenseCount, activeSessionCount, usedLicenseCount] = await Promise.all([
    AppUser.countDocuments({ applicationId: application._id }),
    License.countDocuments({ applicationId: application._id }),
    Session.countDocuments({ applicationId: application._id }),
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

module.exports = router;

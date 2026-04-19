const express = require('express');
const Application = require('../models/Application');
const AppUser = require('../models/AppUser');
const License = require('../models/License');
const Session = require('../models/Session');
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

  await application.save();

  res.json({
    message: 'Application updated successfully',
    application
  });
}));

// Regenerate app secret
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

  // Invalidate all active sessions for this application
  await Session.deleteMany({ applicationId: application._id });

  res.json({
    message: 'App secret regenerated successfully. All active sessions have been invalidated.',
    appSecret: newSecret
  });
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

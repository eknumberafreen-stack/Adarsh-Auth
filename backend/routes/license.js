const express = require('express');
const License = require('../models/License');
const Application = require('../models/Application');
const { verifyToken, verifyAppAccess } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkPlanLimit } = require('../middleware/planLimit');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Generate licenses
router.post('/generate',
  verifyAppAccess('manage_licenses'),
  checkPlanLimit('licensesPerApp'),
  asyncHandler(async (req, res) => {
  const { applicationId, count, mask, uppercase, subscriptionLevel, note, expiryUnit, expiryDuration } = req.body

  if (!applicationId || !expiryUnit) {
    return res.status(400).json({ error: 'applicationId and expiryUnit are required' })
  }

  const licenses = []
  for (let i = 0; i < (count || 1); i++) {
    const key = License.generateKey(mask || null, uppercase !== false)
    const expiryDate = expiryUnit !== 'lifetime'
      ? License.calcExpiry(expiryUnit, expiryDuration)
      : null

    const license = await License.create({
      key,
      applicationId,
      mask: mask || null,
      note: note || null,
      subscriptionLevel: subscriptionLevel || 1,
      expiryUnit,
      expiryDuration: expiryUnit !== 'lifetime' ? expiryDuration : null,
      expiryDate,
      createdBy: req.userId // Track the reseller/owner who made this
    })
    licenses.push(license)
  }

  // Invalidate plan usage cache
  try {
    const { getRedisClient } = require('../config/redis');
    const redis = getRedisClient();
    await redis.del(`plan:usage:${req.userId}`);
  } catch (_) {}

  res.status(201).json({
    message: `${licenses.length} license(s) generated successfully`,
    licenses
  })
}))

// Get all licenses for application (with pagination)
router.get('/application/:applicationId', verifyAppAccess('manage_licenses'), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let filter = { applicationId };
  if (!req.isOwner && req.teamRole === 'reseller') {
    filter.createdBy = req.userId;
  }

  const [licenses, total] = await Promise.all([
    License.find(filter)
      .populate('usedBy', 'username')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    License.countDocuments(filter)
  ]);

  res.json({ 
    licenses,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
}));

// --- Helper for License ID routes ---
const checkLicenseAccess = async (req, res) => {
  const license = await License.findById(req.params.id).populate('applicationId');
  if (!license) { res.status(404).json({ error: 'License not found' }); return null; }
  
  const app = license.applicationId;
  const isOwner = app.userId.toString() === req.userId.toString();
  const teamMember = app.team.find(m => m.userId.toString() === req.userId.toString());

  if (!isOwner) {
    if (!teamMember || !teamMember.permissions.includes('manage_licenses')) {
      res.status(403).json({ error: 'Access denied. Require manage_licenses permission.' });
      return null;
    }
    // Check if team member has expired
    if (teamMember.expiresAt && new Date(teamMember.expiresAt) < new Date()) {
      res.status(403).json({ error: 'Access denied. Your team member access has expired.' });
      return null;
    }
    // Resellers can only modify their own keys
    if (teamMember.role === 'reseller' && license.createdBy?.toString() !== req.userId.toString()) {
      res.status(403).json({ error: 'Access denied. Resellers can only modify their own licenses.' });
      return null;
    }
  }
  return license;
};

// Revoke license
router.post('/:id/revoke', asyncHandler(async (req, res) => {
  const license = await checkLicenseAccess(req, res);
  if (!license) return;
  license.revoked = true;
  license.revokedAt = new Date();
  await license.save();
  res.json({ message: 'License revoked', license });
}));

// Unrevoke license
router.post('/:id/unrevoke', asyncHandler(async (req, res) => {
  const license = await checkLicenseAccess(req, res);
  if (!license) return;
  license.revoked = false;
  license.revokedAt = null;
  await license.save();
  res.json({ message: 'License unrevoked', license });
}));

// Pause license
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const license = await checkLicenseAccess(req, res);
  if (!license) return;
  license.paused = true;
  await license.save();
  res.json({ message: 'License paused' });
}));

// Unpause license
router.post('/:id/unpause', asyncHandler(async (req, res) => {
  const license = await checkLicenseAccess(req, res);
  if (!license) return;
  license.paused = false;
  await license.save();
  res.json({ message: 'License unpaused' });
}));

// Blacklist license permanently
router.post('/:id/blacklist', asyncHandler(async (req, res) => {
  const license = await checkLicenseAccess(req, res);
  if (!license) return;
  const { reason = 'Manual blacklist' } = req.body;
  license.blacklist(reason);
  await license.save();
  res.json({ message: 'License permanently blacklisted' });
}));

// Edit license
router.patch('/:id', asyncHandler(async (req, res) => {
  const license = await checkLicenseAccess(req, res);
  if (!license) return;
  const { note, subscriptionLevel, expiryUnit, expiryDuration } = req.body;
  if (note !== undefined) license.note = note;
  if (subscriptionLevel) license.subscriptionLevel = subscriptionLevel;
  if (expiryUnit) license.expiryUnit = expiryUnit;
  if (expiryDuration) license.expiryDuration = expiryDuration;
  await license.save();
  res.json({ message: 'License updated', license });
}));

// Delete license
router.delete('/:id', asyncHandler(async (req, res) => {
  const license = await checkLicenseAccess(req, res);
  if (!license) return;

  const ownerId = license.applicationId?.userId;
  await License.deleteOne({ _id: license._id });

  // Invalidate plan usage cache
  if (ownerId) {
    try {
      const { getRedisClient } = require('../config/redis');
      const redis = getRedisClient();
      await redis.del(`plan:usage:${ownerId}`);
    } catch (_) {}
  }

  res.json({ message: 'License deleted successfully' });
}));

// Delete all licenses for an application (OWNER/MANAGER ONLY)
router.delete('/application/:applicationId/all', verifyAppAccess('manage_licenses'), asyncHandler(async (req, res) => {
  const application = req.application;
  
  await License.deleteMany({ applicationId: application._id });

  // Invalidate Redis plan usage cache
  try {
    const { getRedisClient } = require('../config/redis');
    const redis = getRedisClient();
    await redis.del(`plan:usage:${application.userId}`);
  } catch (_) {}

  res.json({ message: 'All application licenses deleted successfully' });
}));

// Bulk action on licenses (OWNER/MANAGER ONLY)
router.post('/bulk-action', asyncHandler(async (req, res) => {
  const { licenseIds, action, applicationId } = req.body;
  if (!licenseIds || !Array.isArray(licenseIds) || licenseIds.length === 0 || !applicationId) {
    return res.status(400).json({ error: 'licenseIds, action, and applicationId are required' });
  }

  // Verify access manually
  const app = await Application.findById(applicationId);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const isOwner = app.userId.toString() === req.userId.toString();
  const teamMember = app.team?.find(m => m.userId.toString() === req.userId.toString());
  if (!isOwner) {
    if (!teamMember || !teamMember.permissions.includes('manage_licenses')) {
      return res.status(403).json({ error: 'Access denied: Requires manage_licenses permission.' });
    }
  }

  if (action === 'delete') {
    await License.deleteMany({ _id: { $in: licenseIds }, applicationId });
  } else if (action === 'revoke') {
    await License.updateMany(
      { _id: { $in: licenseIds }, applicationId },
      { $set: { revoked: true, revokedAt: new Date() } }
    );
  } else if (action === 'unrevoke') {
    await License.updateMany(
      { _id: { $in: licenseIds }, applicationId },
      { $set: { revoked: false, revokedAt: null } }
    );
  } else if (action === 'pause') {
    await License.updateMany(
      { _id: { $in: licenseIds }, applicationId },
      { $set: { paused: true } }
    );
  } else if (action === 'unpause') {
    await License.updateMany(
      { _id: { $in: licenseIds }, applicationId },
      { $set: { paused: false } }
    );
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }

  // Invalidate Redis plan usage cache
  try {
    const { getRedisClient } = require('../config/redis');
    const redis = getRedisClient();
    await redis.del(`plan:usage:${app.userId}`);
  } catch (_) {}

  res.json({ message: `Bulk action '${action}' completed successfully` });
}));

module.exports = router;

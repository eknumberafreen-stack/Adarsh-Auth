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

  res.status(201).json({
    message: `${licenses.length} license(s) generated successfully`,
    licenses
  })
}))

// Get all licenses for application
router.get('/application/:applicationId', verifyAppAccess('manage_licenses'), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  let filter = { applicationId };
  // If they are a reseller, they ONLY see licenses they generated
  if (!req.isOwner && req.teamRole === 'reseller') {
    filter.createdBy = req.userId;
  }

  const licenses = await License.find(filter)
    .populate('usedBy', 'username')
    .sort({ createdAt: -1 });

  res.json({ licenses });
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
  await License.deleteOne({ _id: license._id });
  res.json({ message: 'License deleted successfully' });
}));

module.exports = router;

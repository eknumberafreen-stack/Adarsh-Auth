const express = require('express');
const License = require('../models/License');
const Application = require('../models/Application');
const { verifyToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Generate licenses
router.post('/generate', asyncHandler(async (req, res) => {
  const { applicationId, count, mask, uppercase, subscriptionLevel, note, expiryUnit, expiryDuration } = req.body

  if (!applicationId || !expiryUnit) {
    return res.status(400).json({ error: 'applicationId and expiryUnit are required' })
  }

  const application = await Application.findOne({ _id: applicationId, userId: req.userId })
  if (!application) return res.status(404).json({ error: 'Application not found' })

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
      expiryDate
    })
    licenses.push(license)
  }

  res.status(201).json({
    message: `${licenses.length} license(s) generated successfully`,
    licenses
  })
}))

// Get all licenses for application
router.get('/application/:applicationId', asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  // Verify application ownership
  const application = await Application.findOne({
    _id: applicationId,
    userId: req.userId
  });

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const licenses = await License.find({ applicationId })
    .populate('usedBy', 'username')
    .sort({ createdAt: -1 });

  res.json({ licenses });
}));

// Revoke license
router.post('/:id/revoke', asyncHandler(async (req, res) => {
  const license = await License.findById(req.params.id).populate('applicationId');
  if (!license) return res.status(404).json({ error: 'License not found' });
  if (license.applicationId.userId.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Access denied' });
  license.revoked = true;
  license.revokedAt = new Date();
  await license.save();
  res.json({ message: 'License revoked', license });
}));

// Unrevoke license
router.post('/:id/unrevoke', asyncHandler(async (req, res) => {
  const license = await License.findById(req.params.id).populate('applicationId');
  if (!license) return res.status(404).json({ error: 'License not found' });
  if (license.applicationId.userId.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Access denied' });
  license.revoked = false;
  license.revokedAt = null;
  await license.save();
  res.json({ message: 'License unrevoked', license });
}));

// Pause license
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const license = await License.findById(req.params.id).populate('applicationId');
  if (!license) return res.status(404).json({ error: 'License not found' });
  if (license.applicationId.userId.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Access denied' });
  license.paused = true;
  await license.save();
  res.json({ message: 'License paused' });
}));

// Unpause license
router.post('/:id/unpause', asyncHandler(async (req, res) => {
  const license = await License.findById(req.params.id).populate('applicationId');
  if (!license) return res.status(404).json({ error: 'License not found' });
  if (license.applicationId.userId.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Access denied' });
  license.paused = false;
  await license.save();
  res.json({ message: 'License unpaused' });
}));

// Blacklist license permanently
router.post('/:id/blacklist', asyncHandler(async (req, res) => {
  const { reason = 'Manual blacklist' } = req.body;
  const license = await License.findById(req.params.id).populate('applicationId');
  if (!license) return res.status(404).json({ error: 'License not found' });
  if (license.applicationId.userId.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Access denied' });
  license.blacklist(reason);
  await license.save();
  res.json({ message: 'License permanently blacklisted' });
}));

// Edit license
router.patch('/:id', asyncHandler(async (req, res) => {
  const { note, subscriptionLevel, expiryUnit, expiryDuration } = req.body;
  const license = await License.findById(req.params.id).populate('applicationId');
  if (!license) return res.status(404).json({ error: 'License not found' });
  if (license.applicationId.userId.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Access denied' });
  if (note !== undefined) license.note = note;
  if (subscriptionLevel) license.subscriptionLevel = subscriptionLevel;
  if (expiryUnit) license.expiryUnit = expiryUnit;
  if (expiryDuration) license.expiryDuration = expiryDuration;
  await license.save();
  res.json({ message: 'License updated', license });
}));

// Delete license
router.delete('/:id', asyncHandler(async (req, res) => {
  const license = await License.findById(req.params.id).populate('applicationId');
  if (!license) return res.status(404).json({ error: 'License not found' });
  if (license.applicationId.userId.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Access denied' });
  await License.deleteOne({ _id: license._id });
  res.json({ message: 'License deleted successfully' });
}));

module.exports = router;

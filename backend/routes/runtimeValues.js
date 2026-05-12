const express = require('express');
const router = express.Router();
const RuntimeValues = require('../models/RuntimeValues');
const { verifyToken, verifyAppAccess } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Require login for all routes
router.use(verifyToken);

/**
 * GET all values for an app
 */
router.get('/:applicationId', verifyAppAccess('view_dashboard'), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const doc = await RuntimeValues.findOne({ applicationId });
  
  if (!doc) {
    return res.json({ 
      success: true, 
      data: {
        initBase: '',
        offsets: [], weaponOffsets: [], cameraOffsets: [],
        silentAimOffsets: [], espOffsets: [], entityOffsets: [],
        bones: []
      }
    });
  }

  res.json({ success: true, data: doc });
}));

/**
 * PATCH InitBase
 */
router.patch('/:applicationId/initbase', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { value } = req.body;
  const doc = await RuntimeValues.findOneAndUpdate(
    { applicationId },
    { $set: { initBase: value, updatedAt: Date.now() } },
    { upsert: true, new: true }
  );
  res.json({ success: true, data: doc });
}));

/**
 * PATCH Offset (Dynamic Category)
 */
router.patch('/:applicationId/offsets/:category', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { applicationId, category } = req.params;
  const { offsetId, name, value, description } = req.body;

  let doc = await RuntimeValues.findOne({ applicationId });
  if (!doc) doc = new RuntimeValues({ applicationId });

  if (doc[category] === undefined) return res.status(400).json({ error: 'Invalid category' });

  if (offsetId) {
    const item = doc[category].id(offsetId);
    if (item) {
      item.name = name;
      item.value = value;
      item.description = description;
    }
  } else {
    doc[category] = doc[category].filter(o => o.name !== name);
    doc[category].push({ name, value, description });
  }

  await doc.save();
  res.json({ success: true, data: doc });
}));

/**
 * PATCH Bone
 */
router.patch('/:applicationId/bones', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { boneId, name, value } = req.body;

  let doc = await RuntimeValues.findOne({ applicationId });
  if (!doc) doc = new RuntimeValues({ applicationId });

  if (boneId) {
    const item = doc.bones.id(boneId);
    if (item) {
      item.name = name;
      item.value = value;
    }
  } else {
    doc.bones = doc.bones.filter(b => b.name !== name);
    doc.bones.push({ name, value });
  }

  await doc.save();
  res.json({ success: true, data: doc });
}));

/**
 * DELETE Offset
 */
router.delete('/:applicationId/offsets/:category/:offsetId', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { applicationId, category, offsetId } = req.params;
  const doc = await RuntimeValues.findOne({ applicationId });
  if (doc && doc[category]) {
    doc[category].pull({ _id: offsetId });
    await doc.save();
  }
  res.json({ success: true });
}));

/**
 * DELETE Bone
 */
router.delete('/:applicationId/bones/:boneId', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { applicationId, boneId } = req.params;
  const doc = await RuntimeValues.findOne({ applicationId });
  if (doc) {
    doc.bones.pull({ _id: boneId });
    await doc.save();
  }
  res.json({ success: true });
}));

/**
 * DELETE Reset
 */
router.delete('/:applicationId/reset', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  await RuntimeValues.deleteOne({ applicationId });
  res.json({ success: true });
}));

module.exports = router;

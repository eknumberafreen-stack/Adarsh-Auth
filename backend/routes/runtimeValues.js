const express = require('express');
const router = express.Router();
const RuntimeValues = require('../models/RuntimeValues');
const { verifyToken, verifyAppAccess } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Require login for all routes
router.use(verifyToken);

/**
 * GET all values for an app
 * Only allows users who have access to the app
 */
router.get('/:appId', verifyAppAccess('view_dashboard'), asyncHandler(async (req, res) => {
  const { appId } = req.params;
  const doc = await RuntimeValues.findOne({ applicationId: appId });
  
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
router.patch('/:appId/initbase', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { appId } = req.params;
  const { value } = req.body;
  const doc = await RuntimeValues.findOneAndUpdate(
    { applicationId: appId },
    { $set: { initBase: value, updatedAt: Date.now() } },
    { upsert: true, new: true }
  );
  res.json({ success: true, data: doc });
}));

/**
 * PATCH Offset (Dynamic Category)
 */
router.patch('/:appId/offsets/:category', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { appId, category } = req.params;
  const { offsetId, name, value, description } = req.body;

  let doc = await RuntimeValues.findOne({ applicationId: appId });
  if (!doc) doc = new RuntimeValues({ applicationId: appId });

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
router.patch('/:appId/bones', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { appId } = req.params;
  const { boneId, name, value } = req.body;

  let doc = await RuntimeValues.findOne({ applicationId: appId });
  if (!doc) doc = new RuntimeValues({ applicationId: appId });

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
router.delete('/:appId/offsets/:category/:offsetId', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { appId, category, offsetId } = req.params;
  const doc = await RuntimeValues.findOne({ applicationId: appId });
  if (doc && doc[category]) {
    doc[category].pull({ _id: offsetId });
    await doc.save();
  }
  res.json({ success: true });
}));

/**
 * DELETE Bone
 */
router.delete('/:appId/bones/:boneId', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { appId, boneId } = req.params;
  const doc = await RuntimeValues.findOne({ applicationId: appId });
  if (doc) {
    doc.bones.pull({ _id: boneId });
    await doc.save();
  }
  res.json({ success: true });
}));

/**
 * DELETE Reset
 */
router.delete('/:appId/reset', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { appId } = req.params;
  await RuntimeValues.deleteOne({ applicationId: appId });
  res.json({ success: true });
}));

module.exports = router;

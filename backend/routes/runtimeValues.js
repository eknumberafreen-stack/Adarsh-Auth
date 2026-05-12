const express = require('express');
const router = express.Router();
const RuntimeValues = require('../models/RuntimeValues');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes here require login
router.use(protect);

/**
 * Get all values for an app (for the dashboard table)
 */
router.get('/:appId', asyncHandler(async (req, res) => {
  const { appId } = req.params;
  let doc = await RuntimeValues.findOne({ applicationId: appId });
  
  if (!doc) {
    // Return empty structure if not found
    return res.json({ 
      success: true, 
      data: {
        initBase: '',
        offsets: [],
        bones: []
      }
    });
  }

  res.json({ 
    success: true, 
    data: {
      initBase: doc.initBase || '',
      offsets: doc.offsets || [],
      bones: doc.bones || []
    }
  });
}));

/**
 * Update InitBase
 */
router.patch('/:appId/initbase', asyncHandler(async (req, res) => {
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
 * Update or add an offset
 */
router.patch('/:appId/offsets/offsets', asyncHandler(async (req, res) => {
  const { appId } = req.params;
  const { name, value, description } = req.body;

  // Find doc or create
  let doc = await RuntimeValues.findOne({ applicationId: appId });
  if (!doc) {
    doc = new RuntimeValues({ applicationId: appId });
  }

  // Remove existing with same name if any
  doc.offsets = doc.offsets.filter(o => o.name !== name);
  // Add new
  doc.offsets.push({ name, value, description });
  
  await doc.save();
  res.json({ success: true, data: doc });
}));

/**
 * Update or add a bone
 */
router.patch('/:appId/bones', asyncHandler(async (req, res) => {
  const { appId } = req.params;
  const { name, value } = req.body;

  let doc = await RuntimeValues.findOne({ applicationId: appId });
  if (!doc) {
    doc = new RuntimeValues({ applicationId: appId });
  }

  doc.bones = doc.bones.filter(b => b.name !== name);
  doc.bones.push({ name, value });
  
  await doc.save();
  res.json({ success: true, data: doc });
}));

/**
 * Delete a value
 */
router.delete('/:appId/:type/:name', asyncHandler(async (req, res) => {
  const { appId, type, name } = req.params;
  const doc = await RuntimeValues.findOne({ applicationId: appId });
  
  if (doc) {
    if (type === 'offset') {
      doc.offsets = doc.offsets.filter(o => o.name !== name);
    } else if (type === 'bone') {
      doc.bones = doc.bones.filter(b => b.name !== name);
    }
    await doc.save();
  }
  
  res.json({ success: true });
}));

module.exports = router;

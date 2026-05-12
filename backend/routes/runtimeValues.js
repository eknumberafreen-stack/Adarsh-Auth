/**
 * RUNTIME VALUES ROUTES — Dashboard CRUD
 * JWT-protected. Only the application owner or team members with
 * manage_settings permission can read/write runtime values.
 *
 * GET    /api/runtime/:appId          — fetch all values for an app
 * PUT    /api/runtime/:appId          — full replace (upsert)
 * PATCH  /api/runtime/:appId/initbase — update InitBase only
 * PATCH  /api/runtime/:appId/offsets/:category — add/update offset in a category
 * DELETE /api/runtime/:appId/offsets/:category/:offsetId — delete one offset
 * PATCH  /api/runtime/:appId/bones    — add/update a bone
 * DELETE /api/runtime/:appId/bones/:boneId — delete one bone
 * DELETE /api/runtime/:appId/reset    — wipe all values for the app
 */

const express        = require('express');
const RuntimeValues  = require('../models/RuntimeValues');
const Application    = require('../models/Application');
const { verifyToken, verifyAppAccess } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRedisClient } = require('../config/redis');

const router = express.Router();
router.use(verifyToken);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'offsets',
  'weaponOffsets',
  'cameraOffsets',
  'silentAimOffsets',
  'espOffsets',
  'entityOffsets'
];

/** Validate a hex value string — accepts "0x..." or plain decimal */
const isValidValue = (v) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 64;

/** Invalidate the Redis cache for this app's runtime values */
const invalidateCache = async (appId) => {
  try {
    const redis = getRedisClient();
    await redis.del(`rv:${appId}`);
  } catch (_) { /* non-fatal */ }
};

/** Get or create the RuntimeValues document for an app */
const getOrCreate = async (appId) => {
  let doc = await RuntimeValues.findOne({ applicationId: appId });
  if (!doc) {
    doc = await RuntimeValues.create({ applicationId: appId });
  }
  return doc;
};

// ─── GET /api/runtime/:appId ──────────────────────────────────────────────────
router.get('/:appId', verifyAppAccess(), asyncHandler(async (req, res) => {
  const doc = await getOrCreate(req.params.appId);
  res.json({ runtimeValues: doc });
}));

// ─── PUT /api/runtime/:appId — full replace ───────────────────────────────────
router.put('/:appId', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const {
    initBase,
    offsets,
    weaponOffsets,
    cameraOffsets,
    silentAimOffsets,
    espOffsets,
    entityOffsets,
    bones
  } = req.body;

  const doc = await getOrCreate(req.params.appId);

  if (initBase !== undefined) doc.initBase = String(initBase).trim();

  const setCategory = (field, data) => {
    if (!Array.isArray(data)) return;
    doc[field] = data
      .filter(o => o.name && isValidValue(o.value))
      .map(o => ({ name: String(o.name).trim(), value: String(o.value).trim(), description: String(o.description || '').trim() }));
  };

  setCategory('offsets',          offsets);
  setCategory('weaponOffsets',    weaponOffsets);
  setCategory('cameraOffsets',    cameraOffsets);
  setCategory('silentAimOffsets', silentAimOffsets);
  setCategory('espOffsets',       espOffsets);
  setCategory('entityOffsets',    entityOffsets);

  if (Array.isArray(bones)) {
    doc.bones = bones
      .filter(b => b.name && isValidValue(b.value))
      .map(b => ({ name: String(b.name).trim(), value: String(b.value).trim() }));
  }

  await doc.save();
  await invalidateCache(req.params.appId);

  res.json({ message: 'Runtime values updated', runtimeValues: doc });
}));

// ─── PATCH /api/runtime/:appId/initbase ───────────────────────────────────────
router.patch('/:appId/initbase', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (!isValidValue(value)) {
    return res.status(400).json({ error: 'Invalid value' });
  }

  const doc = await getOrCreate(req.params.appId);
  doc.initBase = String(value).trim();
  await doc.save();
  await invalidateCache(req.params.appId);

  res.json({ message: 'InitBase updated', initBase: doc.initBase });
}));

// ─── PATCH /api/runtime/:appId/offsets/:category — upsert one offset ─────────
router.patch('/:appId/offsets/:category', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { category } = req.params;
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Valid: ${VALID_CATEGORIES.join(', ')}` });
  }

  const { name, value, description, offsetId } = req.body;

  if (!name || !isValidValue(value)) {
    return res.status(400).json({ error: 'name and value are required' });
  }

  const doc = await getOrCreate(req.params.appId);

  if (offsetId) {
    // Update existing entry by _id
    const entry = doc[category].id(offsetId);
    if (!entry) return res.status(404).json({ error: 'Offset not found' });
    entry.name  = String(name).trim();
    entry.value = String(value).trim();
    if (description !== undefined) entry.description = String(description).trim();
  } else {
    // Check for duplicate name in this category
    const dup = doc[category].find(o => o.name.toLowerCase() === String(name).toLowerCase().trim());
    if (dup) {
      // Update in place
      dup.value = String(value).trim();
      if (description !== undefined) dup.description = String(description).trim();
    } else {
      doc[category].push({
        name: String(name).trim(),
        value: String(value).trim(),
        description: String(description || '').trim()
      });
    }
  }

  await doc.save();
  await invalidateCache(req.params.appId);

  res.json({ message: 'Offset saved', category: doc[category] });
}));

// ─── DELETE /api/runtime/:appId/offsets/:category/:offsetId ──────────────────
router.delete('/:appId/offsets/:category/:offsetId', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { category, offsetId } = req.params;
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const doc = await getOrCreate(req.params.appId);
  const before = doc[category].length;
  doc[category] = doc[category].filter(o => o._id.toString() !== offsetId);

  if (doc[category].length === before) {
    return res.status(404).json({ error: 'Offset not found' });
  }

  await doc.save();
  await invalidateCache(req.params.appId);

  res.json({ message: 'Offset deleted', category: doc[category] });
}));

// ─── PATCH /api/runtime/:appId/bones — upsert one bone ───────────────────────
router.patch('/:appId/bones', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const { name, value, boneId } = req.body;

  if (!name || !isValidValue(value)) {
    return res.status(400).json({ error: 'name and value are required' });
  }

  const doc = await getOrCreate(req.params.appId);

  if (boneId) {
    const entry = doc.bones.id(boneId);
    if (!entry) return res.status(404).json({ error: 'Bone not found' });
    entry.name  = String(name).trim();
    entry.value = String(value).trim();
  } else {
    const dup = doc.bones.find(b => b.name.toLowerCase() === String(name).toLowerCase().trim());
    if (dup) {
      dup.value = String(value).trim();
    } else {
      doc.bones.push({ name: String(name).trim(), value: String(value).trim() });
    }
  }

  await doc.save();
  await invalidateCache(req.params.appId);

  res.json({ message: 'Bone saved', bones: doc.bones });
}));

// ─── DELETE /api/runtime/:appId/bones/:boneId ────────────────────────────────
router.delete('/:appId/bones/:boneId', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const doc = await getOrCreate(req.params.appId);
  const before = doc.bones.length;
  doc.bones = doc.bones.filter(b => b._id.toString() !== req.params.boneId);

  if (doc.bones.length === before) {
    return res.status(404).json({ error: 'Bone not found' });
  }

  await doc.save();
  await invalidateCache(req.params.appId);

  res.json({ message: 'Bone deleted', bones: doc.bones });
}));

// ─── DELETE /api/runtime/:appId/reset — wipe all values ──────────────────────
router.delete('/:appId/reset', verifyAppAccess('manage_settings'), asyncHandler(async (req, res) => {
  const doc = await getOrCreate(req.params.appId);

  doc.initBase        = '';
  doc.offsets         = [];
  doc.weaponOffsets   = [];
  doc.cameraOffsets   = [];
  doc.silentAimOffsets = [];
  doc.espOffsets      = [];
  doc.entityOffsets   = [];
  doc.bones           = [];

  await doc.save();
  await invalidateCache(req.params.appId);

  res.json({ message: 'All runtime values reset' });
}));

module.exports = router;

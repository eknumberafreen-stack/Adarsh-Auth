/**
 * RUNTIME VALUES MODEL
 * Stores InitBase, Offsets, Bones, and all sub-categories per application.
 * Values are served dynamically to authenticated clients at runtime.
 */

const mongoose = require('mongoose');

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const offsetEntrySchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true }, // hex string e.g. "0x9EC1C48"
  description: { type: String, default: '', trim: true }
}, { _id: true });

const boneEntrySchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true }, // e.g. "Head", "LeftWrist"
  value: { type: String, required: true, trim: true }, // hex string e.g. "0x45C"
}, { _id: true });

// ─── Main Schema ──────────────────────────────────────────────────────────────

const runtimeValuesSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    unique: true,   // one document per application
    index: true
  },

  // ── Core base addresses ───────────────────────────────────────────────────
  initBase: {
    type: String,
    default: '',
    trim: true
  },

  // ── Offset categories ─────────────────────────────────────────────────────
  offsets:       { type: [offsetEntrySchema], default: [] },
  weaponOffsets: { type: [offsetEntrySchema], default: [] },
  cameraOffsets: { type: [offsetEntrySchema], default: [] },
  silentAimOffsets: { type: [offsetEntrySchema], default: [] },
  espOffsets:    { type: [offsetEntrySchema], default: [] },
  entityOffsets: { type: [offsetEntrySchema], default: [] },

  // ── Bone structure ────────────────────────────────────────────────────────
  bones: { type: [boneEntrySchema], default: [] },

  // ── Runtime Controls ──────────────────────────────────────────────────────
  offsetVersion: { type: Number, default: 1 },
  offsetExpiresAt: { type: Date, default: null },
  revoked: { type: Boolean, default: false },

  // ── Metadata ──────────────────────────────────────────────────────────────
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Auto-update updatedAt on every save and increment offsetVersion on change
runtimeValuesSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.isModified() || this.isNew) {
    this.offsetVersion = (this.offsetVersion || 0) + 1;
  }
  next();
});

// ─── Static helpers ───────────────────────────────────────────────────────────

/**
 * Returns a flat JSON object suitable for sending to the client EXE.
 * Format: { InitBase, <offsetName>, ..., bones: { <boneName>: value, ... } }
 */
runtimeValuesSchema.methods.toClientPayload = function () {
  const payload = {};

  if (this.initBase) payload.InitBase = this.initBase;

  const flatOffsets = (arr) => {
    arr.forEach(o => { payload[o.name] = o.value; });
  };

  flatOffsets(this.offsets);
  flatOffsets(this.weaponOffsets);
  flatOffsets(this.cameraOffsets);
  flatOffsets(this.silentAimOffsets);
  flatOffsets(this.espOffsets);
  flatOffsets(this.entityOffsets);

  if (this.bones.length > 0) {
    payload.bones = {};
    this.bones.forEach(b => { payload.bones[b.name] = b.value; });
  }

  return payload;
};

module.exports = mongoose.model('RuntimeValues', runtimeValuesSchema);

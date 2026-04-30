const mongoose = require('mongoose');
const crypto = require('crypto');

const licenseSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true
  },
  mask: { type: String, default: null },
  note: { type: String, default: null },
  subscriptionLevel: { type: Number, default: 1 },
  expiryUnit: {
    type: String,
    enum: ['hours', 'days', 'weeks', 'months', 'lifetime'],
    default: 'days'
  },
  expiryDuration: { type: Number, default: null },
  expiryDate: { type: Date, default: null },

  // Usage
  used: { type: Boolean, default: false },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', default: null },
  usedAt: { type: Date, default: null },

  // Revocation
  revoked: { type: Boolean, default: false },
  revokedAt: { type: Date, default: null },

  // Pause (temporary block)
  paused: { type: Boolean, default: false },

  // PERMANENT BAN — blacklisted license can NEVER be used again
  blacklisted: { type: Boolean, default: false },
  blacklistedAt: { type: Date, default: null },
  blacklistReason: { type: String, default: null },

  // Tracking who generated the key (Owner or Reseller)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Generate key with optional mask
licenseSchema.statics.generateKey = function(mask, uppercase = true) {
  if (mask) {
    const chars = uppercase
      ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      : 'abcdefghijklmnopqrstuvwxyz0123456789';
    return mask.replace(/#/g, () => chars[Math.floor(Math.random() * chars.length)]);
  }
  const raw = crypto.randomBytes(16).toString('hex').toUpperCase();
  return raw.match(/.{1,4}/g).join('-');
};

// Check if license is valid (not blacklisted, not revoked, not expired)
licenseSchema.methods.isValid = function() {
  if (this.blacklisted) return false;
  if (this.revoked) return false;
  if (!this.used) return true;
  if (this.expiryUnit === 'lifetime') return true;
  if (this.expiryDate && this.expiryDate > Date.now()) return true;
  return false;
};

// Calculate expiry date from unit + duration
licenseSchema.statics.calcExpiry = function(unit, duration) {
  if (unit === 'lifetime' || !duration) return null;
  const ms = {
    hours: 1000 * 60 * 60,
    days: 1000 * 60 * 60 * 24,
    weeks: 1000 * 60 * 60 * 24 * 7,
    months: 1000 * 60 * 60 * 24 * 30
  };
  return new Date(Date.now() + duration * (ms[unit] || ms.days));
};

// Blacklist license permanently
licenseSchema.methods.blacklist = function(reason = 'User banned') {
  this.blacklisted = true;
  this.blacklistedAt = new Date();
  this.blacklistReason = reason;
  this.revoked = true;
  this.revokedAt = new Date();
  return this;
};

module.exports = mongoose.model('License', licenseSchema);

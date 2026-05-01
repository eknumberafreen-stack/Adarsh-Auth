const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const appUserSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  email: { type: String, default: null, trim: true },
  subscription: { type: String, default: 'default' },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true
  },

  // HWID — store multiple for device tracking
  hwid: { type: String, default: null },
  hwidHistory: [{ hwid: String, seenAt: Date }],
  hwidAffected: { type: Boolean, default: true },
  hwidResetCount: { type: Number, default: 0 },

  lastLogin: { type: Date, default: null },
  lastIp: { type: String, default: null },
  ipHistory: [{ ip: String, seenAt: Date }],

  expiryDate: { type: Date, default: null },

  // Ban system
  banned: { type: Boolean, default: false },
  bannedAt: { type: Date, default: null },
  banReason: { type: String, default: null },
  banMessage: { type: String, default: null }, // Custom message shown to banned user on login attempt

  // Pause system (temporary block without ban)
  paused: { type: Boolean, default: false },
  pausedExpiry: { type: Date, default: null }, // Backup of expiryDate when paused

  // Anomaly detection counters
  failedLoginCount: { type: Number, default: 0 },
  failedLoginResetAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

appUserSchema.index({ username: 1, applicationId: 1 }, { unique: true });

appUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, rounds);
    next();
  } catch (error) { next(error); }
});

appUserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

appUserSchema.methods.isActive = function() {
  if (this.banned) return false;
  if (this.expiryDate && this.expiryDate < Date.now()) return false;
  return true;
};

appUserSchema.methods.resetHwid = async function() {
  this.hwid = null;
  this.hwidResetCount += 1;
  return await this.save();
};

// Track HWID changes
appUserSchema.methods.trackHwid = function(hwid) {
  if (this.hwid !== hwid) {
    this.hwidHistory.push({ hwid, seenAt: new Date() });
    // Keep last 10 only
    if (this.hwidHistory.length > 10) {
      this.hwidHistory = this.hwidHistory.slice(-10);
    }
  }
};

// Track IP changes
appUserSchema.methods.trackIp = function(ip) {
  const last = this.ipHistory[this.ipHistory.length - 1];
  if (!last || last.ip !== ip) {
    this.ipHistory.push({ ip, seenAt: new Date() });
    if (this.ipHistory.length > 20) {
      this.ipHistory = this.ipHistory.slice(-20);
    }
  }
};

module.exports = mongoose.model('AppUser', appUserSchema);

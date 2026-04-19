const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const appUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: null,
    trim: true
  },
  subscription: {
    type: String,
    default: 'default'
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true
  },
  hwid: {
    type: String,
    default: null
  },
  hwidAffected: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastIp: {
    type: String,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  banned: {
    type: Boolean,
    default: false
  },
  bannedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

appUserSchema.index({ username: 1, applicationId: 1 }, { unique: true });

appUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, rounds);
    next();
  } catch (error) {
    next(error);
  }
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
  return await this.save();
};

module.exports = mongoose.model('AppUser', appUserSchema);

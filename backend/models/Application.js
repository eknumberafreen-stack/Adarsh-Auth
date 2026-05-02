const mongoose = require('mongoose');
const crypto = require('crypto');

const teamMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['manager', 'reseller', 'developer'], default: 'reseller' },
  permissions: [{ type: String, enum: ['manage_licenses', 'manage_users', 'manage_settings', 'view_logs'] }],
  addedAt: { type: Date, default: Date.now }
});

const applicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  ownerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  appSecret: {
    type: String,
    required: true
  },
  version: {
    type: String,
    default: '1.0',
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active'
  },
  hwidLock: {
    type: Boolean,
    default: true
  },
  downloadUrl: {
    type: String,
    default: '',
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userCount: {
    type: Number,
    default: 0
  },
  discordWebhook: {
    type: String,
    default: '',
    trim: true
  },
  team: [teamMemberSchema],
  customMessages: {
    appDisabled: { type: String, default: 'This application is disabled.' },
    appPaused: { type: String, default: 'Application is currently paused.' },
    invalidLicense: { type: String, default: 'Invalid license key.' },
    licenseUsed: { type: String, default: 'License key has already been used.' },
    invalidUsername: { type: String, default: 'Invalid username.' },
    usernameTaken: { type: String, default: 'Username already taken.' },
    hwidMismatch: { type: String, default: 'HWID doesn\'t match. Ask for a reset!' },
    userBanned: { type: String, default: 'You have been blacklisted!' },
    invalidCreds: { type: String, default: 'Invalid username or password.' },
    invalidPassword: { type: String, default: 'Password does not match.' },
    noSubscription: { type: String, default: 'No active subscription found.' },
    accountPaused: { type: String, default: 'Your subscription is paused.' },
    subPaused: { type: String, default: 'Your subscription is paused.' },
    expiredLicense: { type: String, default: 'Your license has expired.' },
    versionMismatch: { type: String, default: 'Application version mismatch. Update your loader!' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate secure credentials
applicationSchema.statics.generateCredentials = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let ownerId = '';
  for (let i = 0; i < 10; i++) {
    ownerId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return {
    ownerId: ownerId,
    appSecret: crypto.randomBytes(32).toString('hex')
  };
};

// Regenerate app secret
applicationSchema.methods.regenerateSecret = function() {
  this.appSecret = crypto.randomBytes(32).toString('hex');
  return this.appSecret;
};

// Verify signature for client requests
applicationSchema.methods.verifySignature = function(data, signature) {
  const hmac = crypto.createHmac('sha256', this.appSecret);
  hmac.update(data);
  const expectedSignature = hmac.digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

module.exports = mongoose.model('Application', applicationSchema);

const mongoose = require('mongoose');
const crypto = require('crypto');

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
    default: '1.0.0',
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active'
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
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate secure credentials
applicationSchema.statics.generateCredentials = function() {
  return {
    ownerId: crypto.randomBytes(16).toString('hex'),
    appSecret: crypto.randomBytes(64).toString('hex')
  };
};

// Regenerate app secret
applicationSchema.methods.regenerateSecret = function() {
  this.appSecret = crypto.randomBytes(64).toString('hex');
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

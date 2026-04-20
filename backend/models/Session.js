const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppUser',
    required: true,
    index: true
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hwid: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Auto-delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Check if session is valid
sessionSchema.methods.isValid = function() {
  return this.expiresAt > Date.now();
};

// Update heartbeat
sessionSchema.methods.updateHeartbeat = async function() {
  this.lastHeartbeat = new Date();
  return await this.save();
};

module.exports = mongoose.model('Session', sessionSchema);

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppUser'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login_success',
      'login_failed',
      'register',
      'license_redeemed',
      'license_revoked',
      'session_created',
      'session_expired',
      'hwid_mismatch',
      'invalid_signature',
      'replay_attack',
      'rate_limit_exceeded',
      'suspicious_activity'
    ]
  },
  ip: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Auto-delete old logs after 90 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

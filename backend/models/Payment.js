const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  amount: {
    type: Number,
    required: true  // in USD cents
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  screenshotUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  adminNote: {
    type: String,
    default: null
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for quick user payment lookups
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);

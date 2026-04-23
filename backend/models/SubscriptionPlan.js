const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['free', 'pro', 'enterprise', 'yearly'],
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    default: 0  // USD cents/month (0 = free)
  },
  limits: {
    maxApplications: {
      type: Number,
      default: 3   // -1 = unlimited
    },
    maxUsersPerApp: {
      type: Number,
      default: 100  // -1 = unlimited
    },
    maxLicensesPerApp: {
      type: Number,
      default: 50   // -1 = unlimited
    },
    maxApiCallsPerDay: {
      type: Number,
      default: 1000  // -1 = unlimited
    }
  },
  features: [{ type: String }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

/**
 * Plan Seeder Utility
 * Seeds default Free, Pro, and Enterprise subscription plans on startup.
 * Uses upsert with $setOnInsert to avoid overwriting existing plan documents.
 */

const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');

const defaultPlans = [
  {
    name: 'free',
    displayName: 'Free',
    price: 0,
    limits: {
      maxApplications: 10,
      maxUsersPerApp: 500,
      maxLicensesPerApp: 100,
      maxApiCallsPerDay: 5000,
    },
    features: [
      '10 applications',
      '500 users/app',
      '100 licenses/app',
      '5,000 API calls/day',
    ],
    isActive: true,
  },
  {
    name: 'pro',
    displayName: 'Pro',
    price: 1900,
    limits: {
      maxApplications: 50,
      maxUsersPerApp: 5000,
      maxLicensesPerApp: 1000,
      maxApiCallsPerDay: 50000,
    },
    features: [
      '50 applications',
      '5,000 users/app',
      '1,000 licenses/app',
      '50,000 API calls/day',
      'Priority Support',
    ],
    isActive: true,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 9900,
    limits: {
      maxApplications: -1,
      maxUsersPerApp: -1,
      maxLicensesPerApp: -1,
      maxApiCallsPerDay: -1,
    },
    features: [
      'Unlimited applications',
      'Unlimited users/app',
      'Unlimited licenses/app',
      'Unlimited API calls/day',
      'Priority Support',
      'Custom Integrations',
    ],
    isActive: true,
  },
];

/**
 * Seed default subscription plans and backfill existing users without a plan.
 * Safe to call multiple times — existing plans are never overwritten.
 */
const seedPlans = async () => {
  try {
    // Upsert each plan — always update limits and features to keep them in sync
    for (const planData of defaultPlans) {
      await SubscriptionPlan.findOneAndUpdate(
        { name: planData.name },
        { $set: planData },
        { upsert: true, new: true }
      );
    }

    // Retrieve the free plan to use its _id for backfilling
    const freePlan = await SubscriptionPlan.findOne({ name: 'free' });

    if (!freePlan) {
      console.error('[seedPlans] Free plan not found after upsert — skipping user backfill.');
      return;
    }

    // Assign the free plan to any existing users that have no plan set
    const result = await User.updateMany(
      { plan: null },
      { $set: { plan: freePlan._id, planAssignedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[seedPlans] Backfilled ${result.modifiedCount} user(s) to the Free plan.`);
    }

    console.log('[seedPlans] Subscription plans seeded successfully.');
  } catch (err) {
    console.error('[seedPlans] Failed to seed plans:', err.message);
  }
};

module.exports = { seedPlans };

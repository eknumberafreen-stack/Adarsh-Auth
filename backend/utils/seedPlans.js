/**
 * Plan Seeder Utility
 * Seeds default Free, Pro, and Enterprise subscription plans on startup.
 */

const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');

const defaultPlans = [
  {
    name: 'free',
    displayName: 'Free',
    price: 0,
    limits: {
      maxApplications: 5,
      maxUsersPerApp: 100,
      maxLicensesPerApp: 50,
      maxApiCallsPerDay: 5000,
    },
    features: [
      '5 applications',
      '100 users/app',
      '50 licenses/app',
      '5,000 API calls/day',
    ],
    isActive: true,
  },
  {
    name: 'pro',
    displayName: 'Pro',
    price: 160,
    limits: {
      maxApplications: 25,
      maxUsersPerApp: 1000,
      maxLicensesPerApp: 500,
      maxApiCallsPerDay: 50000,
    },
    features: [
      '25 applications',
      '1,000 users/app',
      '500 licenses/app',
      '50,000 API calls/day',
      'Discord Webhooks',
      'Priority Support',
    ],
    isActive: true,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 300,
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
      'Discord Webhooks',
      'Priority Support',
      'Custom Integrations',
    ],
    isActive: true,
  },
  {
    name: 'yearly',
    displayName: 'Yearly',
    price: 2650,
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
      'Discord Webhooks',
      'Priority Support',
      'Custom Integrations',
      '1 Year Access',
      'Best Value',
    ],
    isActive: true,
  },
];

/**
 * Fix username index — ensures it is sparse so multiple null values are allowed.
 * Uses User.collection (no extra mongoose import needed).
 */
const fixUsernameIndex = async () => {
  try {
    const collection = User.collection;
    const indexes = await collection.indexes();
    const usernameIndex = indexes.find(i => i.name === 'username_1');

    if (usernameIndex && !usernameIndex.sparse) {
      await collection.dropIndex('username_1');
      await collection.createIndex(
        { username: 1 },
        { unique: true, sparse: true, name: 'username_1' }
      );
      console.log('[fixUsernameIndex] Rebuilt username index as sparse unique.');
    }
  } catch (err) {
    // Non-fatal — log and continue
    console.error('[fixUsernameIndex] Error (non-fatal):', err.message);
  }
};

/**
 * Seed default subscription plans and backfill existing users without a plan.
 * Safe to call multiple times.
 */
const seedPlans = async () => {
  try {
    // Fix username index first
    await fixUsernameIndex();

    // Upsert each plan
    for (const planData of defaultPlans) {
      await SubscriptionPlan.findOneAndUpdate(
        { name: planData.name },
        { $set: planData },
        { upsert: true, new: true }
      );
    }

    const freePlan = await SubscriptionPlan.findOne({ name: 'free' });

    if (!freePlan) {
      console.error('[seedPlans] Free plan not found after upsert — skipping user backfill.');
      return;
    }

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

module.exports = { seedPlans, fixUsernameIndex };

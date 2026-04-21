const User = require('../models/User');
const Application = require('../models/Application');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { getRedisClient } = require('../config/redis');

/**
 * Retrieves a user's current plan and application usage.
 * Results are cached in Redis under key `plan:usage:{userId}` with a 60-second TTL.
 * Falls back to MongoDB if Redis is unavailable.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId - The user's MongoDB ObjectId
 * @returns {Promise<{ plan: object, usage: object }>}
 */
async function getUserPlanWithUsage(userId) {
  const cacheKey = `plan:usage:${userId}`;

  // 1. Try Redis cache
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_err) {
    // Redis unavailable — fall through to MongoDB
  }

  // 2. Fetch from MongoDB
  const [user, applicationCount] = await Promise.all([
    User.findById(userId).populate('plan'),
    Application.countDocuments({ userId })
  ]);

  // 3. Resolve plan — fall back to free plan if user.plan is null
  let plan = user && user.plan;
  if (!plan) {
    plan = await SubscriptionPlan.findOne({ name: 'free' });
  }

  // 4. Build response shape
  const result = {
    plan: {
      name: plan.name,
      displayName: plan.displayName,
      limits: {
        maxApplications: plan.limits.maxApplications,
        maxUsersPerApp: plan.limits.maxUsersPerApp,
        maxLicensesPerApp: plan.limits.maxLicensesPerApp,
        maxApiCallsPerDay: plan.limits.maxApiCallsPerDay
      },
      features: plan.features
    },
    usage: {
      applications: {
        current: applicationCount,
        limit: plan.limits.maxApplications
      }
    }
  };

  // 5. Cache the result in Redis (TTL 60s), silently ignore failures
  try {
    const redis = getRedisClient();
    await redis.setEx(cacheKey, 60, JSON.stringify(result));
  } catch (_err) {
    // Redis unavailable — continue without caching
  }

  return result;
}

module.exports = { getUserPlanWithUsage };

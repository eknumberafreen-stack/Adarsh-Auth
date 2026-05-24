const User = require('../models/User');
const Application = require('../models/Application');
const AppUser = require('../models/AppUser');
const License = require('../models/License');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { getRedisClient } = require('../config/redis');

/**
 * Retrieves a user's current plan and real-time resource usage.
 * Results are cached in Redis under key `plan:usage:{userId}` with a 30-second TTL.
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

  // 2. Fetch user and their applications
  const [user, applications] = await Promise.all([
    User.findById(userId).populate('plan'),
    Application.find({ userId }).select('_id').lean()
  ]);

  // 3. Resolve plan — fall back to free plan if user.plan is null
  let plan = user && user.plan;
  if (!plan) {
    plan = await SubscriptionPlan.findOne({ name: 'free' });
  }

  const applicationCount = applications.length;
  const appIds = applications.map(a => a._id);

  // 4. Count total users and licenses across ALL the user's applications
  let totalUserCount = 0;
  let totalLicenseCount = 0;

  if (appIds.length > 0) {
    [totalUserCount, totalLicenseCount] = await Promise.all([
      AppUser.countDocuments({ applicationId: { $in: appIds } }),
      License.countDocuments({ applicationId: { $in: appIds } })
    ]);
  }

  // 5. Build response shape — limits are strictly bound to the user's current plan
  const result = {
    plan: {
      name: plan.name,
      displayName: plan.displayName,
      price: plan.price,
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
      },
      totalUsers: {
        current: totalUserCount,
        limit: plan.limits.maxUsersPerApp === -1 ? -1 : plan.limits.maxUsersPerApp * applicationCount
      },
      totalLicenses: {
        current: totalLicenseCount,
        limit: plan.limits.maxLicensesPerApp === -1 ? -1 : plan.limits.maxLicensesPerApp * applicationCount
      }
    }
  };

  // 6. Cache the result in Redis (TTL 30s for near-real-time), silently ignore failures
  try {
    const redis = getRedisClient();
    await redis.setEx(cacheKey, 30, JSON.stringify(result));
  } catch (_err) {
    // Redis unavailable — continue without caching
  }

  return result;
}

module.exports = { getUserPlanWithUsage };

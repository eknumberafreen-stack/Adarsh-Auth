const { getRedisClient } = require('../config/redis');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Application = require('../models/Application');
const AppUser = require('../models/AppUser');
const License = require('../models/License');

/**
 * Middleware factory that checks whether a developer has reached their plan
 * limit before allowing resource creation.
 *
 * @param {'applications' | 'usersPerApp' | 'licensesPerApp'} resource
 * @returns {import('express').RequestHandler}
 *
 * Preconditions:
 *   - req.userId is set (verifyToken has already run)
 *   - For 'usersPerApp' and 'licensesPerApp', the applicationId is resolved from
 *     req.params.applicationId, req.body.applicationId, or req.params.id
 */
const checkPlanLimit = (resource) => {
  return async (req, res, next) => {
    try {
      // Resolve applicationId from all possible sources
      const applicationId = req.params.applicationId || req.body.applicationId || req.params.id;

      const cacheKey = `plan:${req.userId}`;
      let plan = null;

      // 1. Try Redis cache; fall back to MongoDB on any Redis error
      try {
        const redis = getRedisClient();
        const cached = await redis.get(cacheKey);
        if (cached) {
          plan = JSON.parse(cached);
        }
      } catch (redisErr) {
        // Redis unavailable — will load from MongoDB below
      }

      if (!plan) {
        // Determine whose plan to check:
        // If this is a per-app resource and the user is a team member, use the APP OWNER's plan
        let planUserId = req.userId;

        if (resource !== 'applications' && applicationId) {
          const app = await Application.findById(applicationId);
          if (app && app.userId.toString() !== req.userId.toString()) {
            // Current user is a team member — use the owner's plan
            planUserId = app.userId;
          }
        }

        // Load user with populated plan from MongoDB
        const user = await User.findById(planUserId).populate('plan');

        if (!user.plan) {
          // Fall back to Free plan limits
          plan = await SubscriptionPlan.findOne({ name: 'free' }).lean();
        } else {
          plan = user.plan.toObject ? user.plan.toObject() : user.plan;
        }

        // Cache the resolved plan with 60s TTL (best-effort)
        try {
          const redis = getRedisClient();
          await redis.setEx(cacheKey, 60, JSON.stringify(plan));
        } catch (redisErr) {
          // Redis write failed — continue without caching
        }
      }

      // 2. If plan is still null (e.g. free plan not seeded yet), fall back to
      //    safe defaults that mirror the Free plan limits
      if (!plan) {
        plan = {
          name: 'free',
          limits: {
            maxApplications: 3,
            maxUsersPerApp: 100,
            maxLicensesPerApp: 50,
          },
        };
      }

      // 3. Determine limit and current count based on resource
      let limit;
      let current;
      let requestedCount = 1; // How many items the user wants to create

      if (resource === 'applications') {
        limit = plan.limits.maxApplications;
        current = await Application.countDocuments({ userId: req.userId });
      } else if (resource === 'usersPerApp') {
        limit = plan.limits.maxUsersPerApp;
        if (!applicationId) {
          return res.status(400).json({ error: 'Application ID is required for user limit check' });
        }
        current = await AppUser.countDocuments({ applicationId });
      } else if (resource === 'licensesPerApp') {
        limit = plan.limits.maxLicensesPerApp;
        if (!applicationId) {
          return res.status(400).json({ error: 'Application ID is required for license limit check' });
        }
        current = await License.countDocuments({ applicationId });
        // Account for batch generation — user might request multiple licenses at once
        requestedCount = parseInt(req.body.count) || 1;
      } else {
        // Unknown resource — let the request through rather than blocking it
        return next();
      }

      // 4. Enforce limit (-1 means unlimited)
      if (limit === -1) {
        return next();
      }

      if (current >= limit) {
        return res.status(403).json({
          error: 'Plan limit reached',
          resource,
          current,
          limit,
          plan: plan.name,
          upgradeRequired: true,
        });
      }

      // 5. Check if batch creation would exceed the limit
      if (current + requestedCount > limit) {
        const remaining = limit - current;
        return res.status(403).json({
          error: `Cannot create ${requestedCount} ${resource}. Only ${remaining} remaining in your plan.`,
          resource,
          current,
          limit,
          remaining,
          plan: plan.name,
          upgradeRequired: remaining <= 0,
        });
      }

      return next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { checkPlanLimit };

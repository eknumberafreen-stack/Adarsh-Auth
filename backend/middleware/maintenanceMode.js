/**
 * GLOBAL KILL SWITCH / MAINTENANCE MODE
 * If MAINTENANCE_MODE=true in Config → block all client API requests
 */

const Config = require('../models/Config');
const { getRedisClient } = require('../config/redis');

const checkMaintenance = async (req, res, next) => {
  try {
    let isMaintenanceMode = false;

    try {
      const redis = getRedisClient();
      const cacheKey = 'config:maintenance_mode';
      const cached = await redis.get(cacheKey);

      if (cached !== null) {
        isMaintenanceMode = cached === 'true';
      } else {
        isMaintenanceMode = await Config.get('MAINTENANCE_MODE', false);
        await redis.setEx(cacheKey, 30, String(isMaintenanceMode));
      }
    } catch (redisErr) {
      console.warn('[maintenanceMode] Redis warning (falling back to Mongo):', redisErr.message);
      // Fallback to MongoDB direct query
      isMaintenanceMode = await Config.get('MAINTENANCE_MODE', false);
    }

    if (isMaintenanceMode) {
      return res.status(503).json({
        success: false,
        message: 'System is under maintenance. Please try again later.'
      });
    }

    next();
  } catch (err) {
    console.error('[maintenanceMode] Critical Error (Redis & MongoDB failed):', err.message);
    // FAIL CLOSED: If we can't verify maintenance status in BOTH, assume it's ON for safety
    return res.status(503).json({
      success: false,
      message: 'System is temporarily unavailable. Please try again later.'
    });
  }
};

module.exports = { checkMaintenance };

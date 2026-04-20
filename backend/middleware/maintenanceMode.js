/**
 * GLOBAL KILL SWITCH / MAINTENANCE MODE
 * If MAINTENANCE_MODE=true in Config → block all client API requests
 */

const Config = require('../models/Config');
const { getRedisClient } = require('../config/redis');

const checkMaintenance = async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const cacheKey = 'config:maintenance_mode';
    const cached = await redis.get(cacheKey);

    let isMaintenanceMode = false;

    if (cached !== null) {
      isMaintenanceMode = cached === 'true';
    } else {
      isMaintenanceMode = await Config.get('MAINTENANCE_MODE', false);
      await redis.setEx(cacheKey, 30, String(isMaintenanceMode));
    }

    if (isMaintenanceMode) {
      return res.status(503).json({
        success: false,
        message: 'System is under maintenance. Please try again later.'
      });
    }

    next();
  } catch (err) {
    console.error('[maintenanceMode] Error:', err.message);
    next(); // Fail open
  }
};

module.exports = { checkMaintenance };

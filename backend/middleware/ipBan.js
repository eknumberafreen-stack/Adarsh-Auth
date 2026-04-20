/**
 * IP BAN MIDDLEWARE
 * Rejects requests from banned IPs before any processing
 */

const IPBan = require('../models/IPBan');
const AuditLog = require('../models/AuditLog');
const { getRedisClient } = require('../config/redis');

const checkIPBan = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  try {
    // Cache check in Redis (5 min TTL) to avoid DB hit on every request
    const redis = getRedisClient();
    const cacheKey = `ipban:${ip}`;
    const cached = await redis.get(cacheKey);

    if (cached === 'banned') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (cached === 'ok') {
      return next();
    }

    // DB check
    const ban = await IPBan.findOne({ ip }).lean();

    if (ban) {
      await redis.setEx(cacheKey, 300, 'banned');
      await AuditLog.create({
        action: 'suspicious_activity',
        ip,
        severity: 'warning',
        details: { reason: 'banned_ip_attempt', banReason: ban.reason }
      }).catch(() => {});
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await redis.setEx(cacheKey, 300, 'ok');
    next();
  } catch (err) {
    // Fail open — don't block if Redis/DB is down
    console.error('[ipBan] Error:', err.message);
    next();
  }
};

module.exports = { checkIPBan };

/**
 * IP BAN MIDDLEWARE
 * Rejects client API requests from banned IPs before processing.
 * Never blocks protected Cloudflare / reverse-proxy / private infrastructure IPs.
 */

const IPBan = require('../models/IPBan');
const AuditLog = require('../models/AuditLog');
const { getRedisClient } = require('../config/redis');
const { getClientIp, isProtectedProxyOrPrivateIp } = require('../utils/ip');

const getSafeRedis = () => {
  try {
    return getRedisClient();
  } catch {
    return null;
  }
};

const checkIPBan = async (req, res, next) => {
  const ip = getClientIp(req);

  // Never block empty, loopback, private, or Cloudflare proxy IPs
  if (!ip || isProtectedProxyOrPrivateIp(ip)) {
    return next();
  }

  try {
    const redis = getSafeRedis();
    const cacheKey = `ipban:${ip}`;

    if (redis) {
      const cached = await redis.get(cacheKey).catch(() => null);
      if (cached === 'banned') {
        console.warn(`[ipBan] Blocked cached banned IP=${ip} path=${req.originalUrl}`);
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      if (cached === 'ok') {
        return next();
      }
    }

    // DB check
    const ban = await IPBan.findOne({ ip }).lean();

    if (ban) {
      if (redis) {
        await redis.setEx(cacheKey, 300, 'banned').catch(() => {});
      }
      console.warn(`[ipBan] Blocked banned IP=${ip} path=${req.originalUrl} reason="${ban.reason || 'Manual ban'}"`);
      await AuditLog.create({
        action: 'suspicious_activity',
        ip,
        severity: 'warning',
        details: { reason: 'banned_ip_attempt', banReason: ban.reason }
      }).catch(() => {});
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (redis) {
      await redis.setEx(cacheKey, 300, 'ok').catch(() => {});
    }
    next();
  } catch (err) {
    // Fail open — don't block if Redis/DB is down
    console.error('[ipBan] Error:', err.message);
    next();
  }
};

/**
 * Removes any Cloudflare / private / reverse-proxy IPs that may have been
 * accidentally written into IPBan before the X-Forwarded-For extraction fix.
 */
const purgeProtectedProxyIPBans = async () => {
  try {
    const allBans = await IPBan.find({}).select('ip').lean();
    const protectedIps = allBans
      .map((entry) => entry.ip)
      .filter((ip) => isProtectedProxyOrPrivateIp(ip));

    if (protectedIps.length === 0) return 0;

    await IPBan.deleteMany({ ip: { $in: protectedIps } });
    const redis = getSafeRedis();
    if (redis) {
      await Promise.all(protectedIps.map((ip) => redis.del(`ipban:${ip}`).catch(() => {})));
    }
    console.warn(
      `[ipBan] Auto-purged ${protectedIps.length} protected proxy/private IP ban(s): ${protectedIps.join(', ')}`
    );
    return protectedIps.length;
  } catch (err) {
    console.error('[ipBan] Failed to purge protected proxy IP bans:', err.message);
    return 0;
  }
};

module.exports = { checkIPBan, purgeProtectedProxyIPBans };

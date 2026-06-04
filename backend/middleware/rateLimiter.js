/**
 * IMPROVED RATE LIMITER
 * Fix #8: Per-IP + Per-App + Per-Endpoint limits using Redis
 */

const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');
const { getClientIp } = require('../utils/ip');

// ─── Redis-backed manual rate limiter ─────────────────────────────────────────

/**
 * Creates a Redis-backed rate limiter
 * @param {string} prefix   - Redis key prefix
 * @param {number} maxReqs  - Max requests allowed
 * @param {number} windowMs - Window in milliseconds
 * @param {Function} keyFn  - Function to extract key from req
 */
const redisRateLimiter = (prefix, maxReqs, windowMs, keyFn) => {
  return async (req, res, next) => {
    try {
      const redis   = getRedisClient();
      const key     = `rl:${prefix}:${keyFn(req)}`;
      const windowS = Math.ceil(windowMs / 1000);

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowS);
      }

      if (current > maxReqs) {
        return res.status(429).json({ success: false, message: 'Too many requests' });
      }

      next();
    } catch (err) {
      // If Redis fails, allow request (fail open) but log it
      console.error('[rateLimiter] Redis error:', err.message);
      next();
    }
  };
};

// ─── Global rate limiter (memory-based fallback) ──────────────────────────────
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Increased from 500 to support multi-request dashboard page loads
  message: { success: false, message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => {
    // Skip rate limiting for Google OAuth endpoints to avoid blocking callback redirects
    const path = req.path || req.originalUrl || '';
    return path.includes('/auth/google') || path.includes('/callback');
  }
});

// ─── Auth endpoints: strict ───────────────────────────────────────────────────
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many login attempts, please try again later' },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => getClientIp(req)
});

// ─── Per-IP client API limiter ────────────────────────────────────────────────
const clientIpLimiter = redisRateLimiter(
  'client:ip',
  60,
  60_000,
  req => getClientIp(req)
);

// ─── Per-App client API limiter ───────────────────────────────────────────────
const clientAppLimiter = redisRateLimiter(
  'client:app',
  100,
  60_000,
  req => req.body?.owner_id || 'unknown'
);

// ─── Per-endpoint limiter factory ─────────────────────────────────────────────
const endpointLimiter = (endpoint, maxReqs = 30, windowMs = 60_000) =>
  redisRateLimiter(
    `ep:${endpoint}`,
    maxReqs,
    windowMs,
    req => getClientIp(req)
  );

// ─── Combined client API limiter ──────────────────────────────────────────────
const clientApiRateLimiter = [clientIpLimiter, clientAppLimiter];

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  clientApiRateLimiter,
  endpointLimiter
};

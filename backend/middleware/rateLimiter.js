const rateLimit = require('express-rate-limit');

// Global rate limiter (no Redis store - uses memory)
const globalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 500,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many authentication attempts' },
  skipSuccessfulRequests: true
});

// Client API rate limiter
const clientApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded' },
  keyGenerator: (req) => {
    const ip = req.ip;
    const ownerId = req.body?.owner_id || req.headers['x-owner-id'] || 'unknown';
    return `${ip}:${ownerId}`;
  }
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  clientApiRateLimiter
};

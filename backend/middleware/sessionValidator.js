/**
 * SESSION VALIDATION MIDDLEWARE
 * Fixes #3 (session-dependent validation) and #5 (session binding)
 *
 * Validates:
 * - Session exists and is not expired
 * - HWID matches (strict)
 * - IP matches (soft — logs mismatch but does not block)
 * - Heartbeat is recent (within HEARTBEAT_TIMEOUT_MS)
 */

const AppUser   = require('../models/AppUser');
const AuditLog  = require('../models/AuditLog');
const { getRedisClient } = require('../config/redis');

const HEARTBEAT_TIMEOUT_MS = 60_000; // 60 seconds — client must heartbeat every ~20s

const randomDelay = () =>
  new Promise(r => setTimeout(r, Math.floor(Math.random() * 200) + 100));

const requireSession = async (req, res, next) => {
  const ip = req.clientIp || req.ip;

  try {
    const { session_token, hwid } = req.clientBody || req.body;

    if (!session_token || !hwid) {
      return res.status(401).json({ success: false, message: 'Request failed' });
    }

    // ── Load session from Redis ──────────────────────────────────────────────
    const redis = getRedisClient();
    const key = `sess:${session_token}`;
    const session = await redis.hGetAll(key);
    
    if (!session || Object.keys(session).length === 0) {
      await randomDelay();
      return res.status(401).json({ success: false, message: 'Request failed' });
    }

    // Check application binding
    if (!req.application || session.applicationId !== req.application._id.toString()) {
       return res.status(401).json({ success: false, message: 'Request failed' });
    }

    // ── Heartbeat timeout check ───────────────────────────────────────────────
    const timeSinceHeartbeat = Date.now() - parseInt(session.lastHeartbeat);
    if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT_MS) {
      await redis.del(key);
      await AuditLog.create({
        applicationId: req.application._id,
        userId: session.userId,
        action: 'session_expired',
        ip,
        severity: 'info',
        details: { reason: 'heartbeat_timeout', timeSinceHeartbeat }
      });
      return res.status(401).json({ success: false, message: 'Session expired' });
    }

    // ── HWID binding (strict) ─────────────────────────────────────────────────
    if (session.hwid !== hwid) {
      await AuditLog.create({
        applicationId: req.application._id,
        userId: session.userId,
        action: 'hwid_mismatch',
        ip,
        severity: 'critical',
        details: { expected: session.hwid, received: hwid }
      });
      await randomDelay();
      return res.status(403).json({ success: false, message: 'Request failed' });
    }

    // ── IP soft check (log only, do not block) ────────────────────────────────
    if (session.ip && session.ip !== ip) {
      await AuditLog.create({
        applicationId: req.application._id,
        userId: session.userId,
        action: 'suspicious_activity',
        ip,
        severity: 'warning',
        details: { reason: 'ip_mismatch', originalIp: session.ip, currentIp: ip }
      });
    }

    // ── Load user and check active ────────────────────────────────────────────
    const user = await AppUser.findById(session.userId);
    if (!user || !user.isActive()) {
      await redis.del(key);
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    req.sessionToken = session_token;
    req.session      = session;
    req.sessionUser  = user;
    next();

  } catch (err) {
    console.error('[sessionValidator] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Request failed' });
  }
};

module.exports = { requireSession };

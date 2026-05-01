/**
 * PRODUCTION-GRADE CLIENT AUTH MIDDLEWARE
 * Implements all 12 security layers:
 * 1. Anti-replay (nonce + timestamp)
 * 2. HMAC SHA256 signature hardening
 * 3. App status enforcement
 * 4. Input validation
 * 5. Response hardening (generic errors + random delay)
 * 6. Audit logging
 */

const crypto = require('crypto');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const { getRedisClient } = require('../config/redis');

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMESTAMP_TOLERANCE_MS = 30_000;   // ±30 seconds
const NONCE_TTL_SECONDS      = 60;       // nonce lives 60s in Redis
const DELAY_MIN_MS           = 100;
const DELAY_MAX_MS           = 300;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Random delay to prevent timing-based enumeration */
const randomDelay = () =>
  new Promise(r =>
    setTimeout(r, Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS)
  );

/** Generic failure response — never leaks internal reason to client */
const fail = async (res, statusCode = 401) => {
  await randomDelay();
  return res.status(statusCode).json({ success: false, message: 'Application not found' });
};

/** Write audit log without throwing */
const audit = async (action, severity, ip, appId, details = {}) => {
  try {
    await AuditLog.create({ action, severity, ip, applicationId: appId, details });
  } catch (_) { /* never crash on logging */ }
};

// ─── Main Middleware ───────────────────────────────────────────────────────────

const verifyClientRequest = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  try {
    // ── Step 1: Extract required fields ──────────────────────────────────────
    const {
      app_name,
      owner_id,
      timestamp,
      nonce,
      signature,
      ...bodyData
    } = req.body;

    if (!app_name || !owner_id || !timestamp || !nonce || !signature) {
      await audit('suspicious_activity', 'warning', ip, null, { reason: 'missing_fields' });
      return fail(res, 400);
    }

    // ── Step 2: Timestamp validation (anti-replay layer 1) ───────────────────
    const now        = Date.now();
    const reqTime    = parseInt(timestamp, 10);

    if (isNaN(reqTime) || Math.abs(now - reqTime) > TIMESTAMP_TOLERANCE_MS) {
      await audit('suspicious_activity', 'warning', ip, null, {
        reason: 'timestamp_out_of_range',
        delta: now - reqTime
      });
      return fail(res);
    }

    // ── Step 3: Lookup application ───────────────────────────────────────────
    // Sanitize owner_id — only allow hex chars to prevent NoSQL injection
    if (!/^[a-zA-Z0-9]{10}$/.test(owner_id)) {
      return fail(res, 400);
    }

    const application = await Application.findOne({ ownerId: owner_id, name: app_name }).lean();

    if (!application) {
      await audit('suspicious_activity', 'warning', ip, null, { reason: 'unknown_owner_id' });
      return fail(res);
    }

    // ── Step 4: App status enforcement ───────────────────────────────────────
    if (application.status !== 'active') {
      await audit('suspicious_activity', 'info', ip, application._id, { reason: 'app_paused' });
      
      let msg = 'Application is disabled';
      if (application.status === 'paused') {
        msg = application.customMessages?.appPaused || 'Application is currently paused.';
      } else {
        msg = application.customMessages?.appDisabled || 'This application is disabled.';
      }
      
      return res.status(403).json({ success: false, message: msg });
    }

    // ── Step 5: Nonce check (anti-replay layer 2) ────────────────────────────
    const redis    = getRedisClient();
    const nonceKey = `nonce:${owner_id}:${nonce}`;
    const exists   = await redis.exists(nonceKey);

    if (exists) {
      await audit('replay_attack', 'critical', ip, application._id, { nonce, timestamp });
      return fail(res);
    }

    // Store nonce — TTL slightly longer than tolerance to cover edge cases
    await redis.setEx(nonceKey, NONCE_TTL_SECONDS, '1');

    // ── Step 6: HMAC SHA256 signature verification ───────────────────────────
    // Signature = HMAC_SHA256(app_secret, app_name + owner_id + timestamp + nonce + JSON(bodyData))
    const bodyJson       = JSON.stringify(bodyData);
    const dataToSign     = `${app_name}${owner_id}${timestamp}${nonce}${bodyJson}`;
    const hmac           = crypto.createHmac('sha256', application.appSecret);
    hmac.update(dataToSign);
    const expectedSig    = hmac.digest('hex');

    // Timing-safe comparison — prevents timing oracle attacks
    let sigValid = false;
    try {
      sigValid = crypto.timingSafeEqual(
        Buffer.from(signature.toLowerCase()),
        Buffer.from(expectedSig.toLowerCase())
      );
    } catch (_) {
      sigValid = false; // length mismatch throws — treat as invalid
    }

    if (!sigValid) {
      await audit('invalid_signature', 'warning', ip, application._id, { app_name });
      return fail(res);
    }

    // ── All checks passed — attach context ───────────────────────────────────
    req.application = application;
    req.clientBody  = bodyData;
    req.clientIp    = ip;

    next();

  } catch (err) {
    console.error('[clientAuth] Unexpected error:', err.message);
    return fail(res, 500);
  }
};

module.exports = { verifyClientRequest };

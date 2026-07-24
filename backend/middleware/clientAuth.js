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
const fs = require('fs');
const path = require('path');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const { getRedisClient } = require('../config/redis');
const Config = require('../models/Config');
const { getClientIp } = require('../utils/ip');

// Load RSA Private Key for Response Signing
const privateKeyPath = path.join(__dirname, '..', 'config', 'keys', 'private.pem');
let privateKey = null;
try {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
} catch (err) {
    console.error('❌ CRITICAL: Private Key not found! RSA signing will fail.');
}

const {
  sendDiscordWebhook,
  loginEmbed,
  registerEmbed,
  loginFailedEmbed,
  bannedEmbed,
  hwidMismatchEmbed,
  integrityFailureEmbed,
} = require('../utils/discord');

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMESTAMP_TOLERANCE_MS = 60_000;    // ±60 seconds (Client now syncs with Google)
const NONCE_TTL_SECONDS      = 86400;   // Keep 24h nonce for extra safety
const DELAY_MIN_MS           = 100;
const DELAY_MAX_MS           = 300;
const APP_CACHE_TTL          = 60;       // cache app data for 60s

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Random delay to prevent timing-based enumeration */
const randomDelay = () =>
  new Promise(r =>
    setTimeout(r, Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS)
  );

/** Generic failure response — uses custom message if available */
const fail = async (req, res, statusCode = 401, messageKey = null, defaultMessage = 'Application not found') => {
  await randomDelay();
  
  let message = defaultMessage;
  const customMsg = req.application?.customMessages?.[messageKey];
  if (messageKey && customMsg) {
    message = customMsg;
  }

  return res.status(statusCode).json({ success: false, message });
};

/** Sign the response for the client to verify (RSA Asymmetric) */
const signResponse = (res, data, secret, nonce) => {
  if (!secret || !nonce) return res.json(data);
  
  const bodyStr = JSON.stringify(data);
  const payload = bodyStr + nonce;

  // HMAC (Symmetric) - Keeping for legacy support or double-layer
  const hmacSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // RSA (Asymmetric) - The new "Elite" protection
  let rsaSignature = null;
  if (privateKey) {
      const signer = crypto.createSign('SHA256');
      signer.update(payload);
      rsaSignature = signer.sign(privateKey, 'base64');
  }

  return res.json({ 
      ...data, 
      signature: hmacSignature, // Old client expects this
      rsa_sig: rsaSignature      // New client will use this
  });
};

/** Write audit log without throwing */
const audit = async (action, severity, ip, appId, details = {}) => {
  try {
    await AuditLog.create({ action, severity, ip, applicationId: appId, details });
  } catch (_) { /* never crash on logging */ }
};

// ─── Main Middleware ───────────────────────────────────────────────────────────

const verifyClientRequest = async (req, res, next) => {
  const ip = getClientIp(req);

  try {
    // ── Step 1: Extract required fields ──────────────────────────────────────
    const {
      app_name,
      owner_id,
      timestamp,
      nonce,
      signature,
      version,
      client_hash,
      ...bodyData
    } = req.body;

    if (!app_name || !owner_id || !timestamp || !nonce || !signature) {
      await audit('suspicious_activity', 'warning', ip, null, { reason: 'missing_fields' });
      return fail(req, res, 400);
    }

    // ── Step 2: Timestamp validation (anti-replay layer 1) ───────────────────
    const now        = Date.now();
    const reqTime    = parseInt(timestamp, 10);

    if (isNaN(reqTime) || Math.abs(now - reqTime) > TIMESTAMP_TOLERANCE_MS) {
      await audit('suspicious_activity', 'warning', ip, null, {
        reason: 'timestamp_out_of_range',
        delta: now - reqTime
      });
      return fail(req, res);
    }

    // ── Step 2.5: Maintenance Mode Double-Check (Layer 2) ────────────────────
    let isMaintenance = false;
    try {
      const redis = getRedisClient();
      const maintCached = await redis.get('config:maintenance_mode');
      if (maintCached !== null) {
        isMaintenance = maintCached === 'true';
      } else {
        const Config = require('../models/Config');
        isMaintenance = await Config.get('MAINTENANCE_MODE', false);
      }
    } catch (redisErr) {
      console.warn('[clientAuth] Redis warning during maintenance check:', redisErr.message);
      try {
        const Config = require('../models/Config');
        isMaintenance = await Config.get('MAINTENANCE_MODE', false);
      } catch (dbErr) {
        console.error('[clientAuth] MongoDB error during maintenance check:', dbErr.message);
        // Fail closed on critical db + redis failure for safety
        isMaintenance = true;
      }
    }

    if (isMaintenance) {
      return res.status(503).json({ success: false, message: 'System under maintenance.' });
    }

    // ── Step 3: Lookup application (with Redis caching) ─────────────────────
    const appCacheKey = `app:${owner_id || 'any'}:${app_name}`;
    let application = null;

    try {
      const redis = getRedisClient();
      const cached = await redis.get(appCacheKey);
      if (cached) {
        application = JSON.parse(cached);
      }
    } catch (redisErr) {
      console.warn('[clientAuth] Redis warning during app cache get:', redisErr.message);
    }

    if (!application) {
      if (owner_id && /^[a-zA-Z0-9]{10,64}$/.test(owner_id)) {
        application = await Application.findOne({ ownerId: owner_id, name: { $regex: new RegExp(`^${app_name}$`, 'i') } }).lean();
      }
      if (!application) {
        // Fallback lookup by application name alone (case-insensitive)
        application = await Application.findOne({ name: { $regex: new RegExp(`^${app_name}$`, 'i') } }).lean();
      }

      if (application) {
        try {
          const redis = getRedisClient();
          await redis.setEx(appCacheKey, APP_CACHE_TTL, JSON.stringify(application));
        } catch (redisErr) {
          console.warn('[clientAuth] Redis warning during app cache set:', redisErr.message);
        }
      }
    }

    if (!application) {
      await audit('suspicious_activity', 'warning', ip, null, { reason: 'unknown_owner_id_or_app', app_name });
      return fail(req, res, 401, 'appNotFound', 'Application not found');
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

    // ── Step 5: Version check (Mandatory) ────────────────────────────────────
    const clientVersion = String(version || '0.0.0'); 
    const serverVersion = String(application.version || '1.0');

    if (clientVersion !== serverVersion) {
      const downloadUrl = application.downloadUrl || '';
      
      // If an auto-update download link is configured, show a friendly update message
      if (downloadUrl) {
        return res.status(403).json({ 
          success: false, 
          message: 'New update available! Redirecting to download link...',
          downloadUrl
        });
      }

      // No download link configured — show the standard version mismatch error
      const msg = application.customMessages?.versionMismatch || 'Application version mismatch. Update your loader!';
      return res.status(403).json({ 
        success: false, 
        message: msg
      });
    }
    
    // ── Step 5.5: Integrity Check (Optional) ─────────────────────────────────
    if (application.integrityCheck && application.clientHash) {
      if (client_hash !== application.clientHash) {
        await audit('integrity_failure', 'critical', ip, application._id, { 
          expected: application.clientHash, 
          received: client_hash 
        });
        
        // Discord Webhook — Integrity Failure
        sendDiscordWebhook(application.discordWebhook,
          integrityFailureEmbed(req.body.username, ip, application.name, application.clientHash, client_hash));

        return res.status(403).json({ 
          success: false, 
          message: application.customMessages?.integrityFailure || 'Client integrity check failed. Modified EXE detected.' 
        });
      }
    }

    // ── Step 6: Nonce check (anti-replay layer 2) ────────────────────────────
    const nonceKey = `nonce:${owner_id}:${nonce}`;
    let exists = false;
    try {
      const redis = getRedisClient();
      exists = await redis.exists(nonceKey);
    } catch (redisErr) {
      console.warn('[clientAuth] Redis warning during nonce check:', redisErr.message);
    }

    if (exists) {
      await audit('replay_attack', 'critical', ip, application._id, { nonce, timestamp });
      return fail(req, res);
    }

    try {
      const redis = getRedisClient();
      // Store nonce — TTL slightly longer than tolerance to cover edge cases
      await redis.setEx(nonceKey, NONCE_TTL_SECONDS, '1');
    } catch (redisErr) {
      console.warn('[clientAuth] Redis warning during nonce set:', redisErr.message);
    }

    // ── Step 6: HMAC SHA256 signature verification ───────────────────────────
    // Dual-Check: Try sorted first (new), then raw (old) for backwards compatibility
    const sortedBody = {};
    Object.keys(bodyData).sort().forEach(key => { sortedBody[key] = bodyData[key]; });
    
    const bodyJsonSorted = JSON.stringify(sortedBody);
    const bodyJsonRaw    = JSON.stringify(bodyData);
    
    const dataSorted = `${app_name}${owner_id}${timestamp}${nonce}${bodyJsonSorted}`;
    const dataRaw    = `${app_name}${owner_id}${timestamp}${nonce}${bodyJsonRaw}`;
    
    const hmacSorted = crypto.createHmac('sha256', application.appSecret).update(dataSorted).digest('hex');
    const hmacRaw    = crypto.createHmac('sha256', application.appSecret).update(dataRaw).digest('hex');

    // Timing-safe comparison against both possibilities
    const check = (sig) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(signature.toLowerCase()), Buffer.from(sig.toLowerCase()));
      } catch (_) { return false; }
    };

    if (!check(hmacSorted) && !check(hmacRaw)) {
      await audit('invalid_signature', 'warning', ip, application._id, { app_name });
      return fail(req, res);
    }

    // ── All checks passed — attach context ───────────────────────────────────
    req.application = application;
    req.clientBody  = bodyData;
    req.clientIp    = ip;
    req.nonce       = nonce;

    // Attach response signer to res
    res.sendSigned = (data) => signResponse(res, data, application.appSecret, nonce);

    next();

  } catch (err) {
    console.error('[clientAuth] Unexpected error:', err.message);
    return fail(req, res, 500);
  }
};

module.exports = { verifyClientRequest };

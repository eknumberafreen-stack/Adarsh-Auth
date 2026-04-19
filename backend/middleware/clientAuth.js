const crypto = require('crypto');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const { getRedisClient } = require('../config/redis');

/**
 * CRITICAL SECURITY MIDDLEWARE
 * Validates all client API requests with:
 * - Signature verification (HMAC SHA256)
 * - Timestamp validation (prevents replay attacks)
 * - Nonce validation (prevents request reuse)
 * - Application status check
 */
const verifyClientRequest = async (req, res, next) => {
  try {
    const { app_name, owner_id, timestamp, nonce, signature, ...bodyData } = req.body;

    // 1. Validate required fields
    if (!app_name || !owner_id || !timestamp || !nonce || !signature) {
      await logSuspiciousActivity(req, null, 'missing_required_fields');
      return res.status(400).json({ error: 'Invalid request' });
    }

    // 2. Find application
    const application = await Application.findOne({ ownerId: owner_id });
    if (!application) {
      await logSuspiciousActivity(req, null, 'invalid_owner_id');
      await randomDelay();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Check application status
    if (application.status !== 'active') {
      await logSuspiciousActivity(req, application._id, 'app_paused');
      return res.status(403).json({ error: 'Application is not active' });
    }

    // 4. Validate timestamp (prevent replay attacks)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const tolerance = parseInt(process.env.TIMESTAMP_TOLERANCE) || 30000; // 30 seconds

    if (Math.abs(now - requestTime) > tolerance) {
      await logSuspiciousActivity(req, application._id, 'timestamp_out_of_range');
      await randomDelay();
      return res.status(401).json({ error: 'Invalid request' });
    }

    // 5. Check nonce (prevent request reuse)
    const redis = getRedisClient();
    const nonceKey = `nonce:${owner_id}:${nonce}`;
    const nonceExists = await redis.exists(nonceKey);

    if (nonceExists) {
      await logSuspiciousActivity(req, application._id, 'replay_attack');
      await AuditLog.create({
        applicationId: application._id,
        action: 'replay_attack',
        ip: req.ip,
        severity: 'critical',
        details: { nonce, timestamp }
      });
      await randomDelay();
      return res.status(401).json({ error: 'Invalid request' });
    }

    // Store nonce with TTL
    const nonceTTL = parseInt(process.env.NONCE_TTL) || 60;
    await redis.setEx(nonceKey, nonceTTL, '1');

    // 6. Verify signature
    // Signature is HMAC SHA256 of: app_name + owner_id + timestamp + nonce + JSON(body)
    const bodyJson = JSON.stringify(bodyData);
    const dataToSign = `${app_name}${owner_id}${timestamp}${nonce}${bodyJson}`;
    
    const isValid = application.verifySignature(dataToSign, signature);

    if (!isValid) {
      await logSuspiciousActivity(req, application._id, 'invalid_signature');
      await AuditLog.create({
        applicationId: application._id,
        action: 'invalid_signature',
        ip: req.ip,
        severity: 'warning',
        details: { app_name }
      });
      await randomDelay();
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Attach application to request
    req.application = application;
    req.clientData = bodyData;
    next();

  } catch (error) {
    console.error('Client auth error:', error);
    await randomDelay();
    return res.status(500).json({ error: 'An error occurred' });
  }
};

// Random delay to prevent timing attacks
const randomDelay = () => {
  const delay = Math.floor(Math.random() * 400) + 100; // 100-500ms
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Log suspicious activity
const logSuspiciousActivity = async (req, applicationId, reason) => {
  try {
    await AuditLog.create({
      applicationId,
      action: 'suspicious_activity',
      ip: req.ip,
      severity: 'warning',
      details: { reason, body: req.body }
    });
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
  }
};

module.exports = { verifyClientRequest };

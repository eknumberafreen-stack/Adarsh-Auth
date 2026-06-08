const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { validate, schemas } = require('../middleware/validation');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/email');

// DJB2 Hash function
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Slow nested hashing for browser verification
function slowHash(salt, nonce) {
  let val = salt + nonce;
  for (let i = 0; i < 250; i++) {
    val = djb2Hash(val).toString();
  }
  return djb2Hash(val);
}

// Cloudflare Turnstile token verification helper
const verifyTurnstile = async (token) => {
  const secret = process.env.TURNSTILE_SECRET_KEY || '0x4AAAAAAADgoal4XaJoO9yJMLentbxfeS78';
  
  if (typeof fetch === 'function') {
    try {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token })
      });
      const data = await res.json();
      return !!data.success;
    } catch (err) {
      console.error('[Turnstile fetch error]', err);
      return false;
    }
  }
  
  return new Promise((resolve) => {
    const https = require('https');
    const postData = JSON.stringify({ secret, response: token });
    
    const req = https.request({
      hostname: 'challenges.cloudflare.com',
      port: 443,
      path: '/turnstile/v0/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(!!parsed.success);
        } catch {
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('[Turnstile https error]', err);
      resolve(false);
    });
    req.write(postData);
    req.end();
  });
};

const router = express.Router();

// Debug route to test SMTP configuration and output the exact error to the client
router.get('/test-email', asyncHandler(async (req, res) => {
  const user = process.env.SMTP_USER;
  const apiKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!user && !apiKey && !resendKey) {
    return res.status(400).json({
      error: 'No email service credentials (SMTP, Brevo, or Resend) configured in environment variables.',
      envKeysPresent: {
        SMTP_USER: !!user,
        BREVO_API_KEY: !!apiKey,
        RESEND_API_KEY: !!resendKey
      }
    });
  }

  try {
    console.log('[Diagnostic] Attempting to send test email using sendOTPEmail...');
    const targetEmail = user || 'ninja05102007@gmail.com';
    const success = await sendOTPEmail(targetEmail, '123456');

    if (success) {
      return res.json({
        success: true,
        message: `Verification test email sent successfully to ${targetEmail}!`,
        configUsed: {
          viaResendAPI: !!resendKey,
          viaBrevoAPI: !!apiKey,
          user: user,
          from: process.env.SMTP_FROM
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Check server logs for detailed error trace.',
        configUsed: {
          viaResendAPI: !!resendKey,
          viaBrevoAPI: !!apiKey,
          user: user,
          from: process.env.SMTP_FROM
        }
      });
    }
  } catch (error) {
    console.error('[Diagnostic Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      configUsed: {
        viaResendAPI: !!resendKey,
        viaBrevoAPI: !!apiKey,
        user: user,
        from: process.env.SMTP_FROM
      }
    });
  }
}));

// Route to test Resend directly and output the exact HTTP status and API response body
router.get('/test-resend-direct', asyncHandler(async (req, res) => {
  const https = require('https');
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Adarsh Auth Security <onboarding@resend.dev>';
  const to = req.query.to || 'ninja05102007@gmail.com';

  if (!apiKey) {
    return res.status(400).json({ error: 'RESEND_API_KEY is not set.' });
  }

  const postData = JSON.stringify({
    from,
    to: [to],
    subject: '🔒 Resend Direct Diagnostic Test',
    html: '<h3>Direct test from Adarsh Auth backend</h3>'
  });

  const options = {
    hostname: 'api.resend.com',
    port: 443,
    path: '/emails',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  try {
    const apiResponse = await new Promise((resolve, reject) => {
      const reqApi = https.request(options, (resApi) => {
        let body = '';
        resApi.on('data', (chunk) => body += chunk);
        resApi.on('end', () => {
          resolve({
            statusCode: resApi.statusCode,
            body: body
          });
        });
      });
      reqApi.on('error', (e) => reject(e));
      reqApi.write(postData);
      reqApi.end();
    });

    return res.json({
      success: apiResponse.statusCode >= 200 && apiResponse.statusCode < 300,
      statusCode: apiResponse.statusCode,
      responseBody: apiResponse.body ? JSON.parse(apiResponse.body) : null,
      configUsed: {
        from,
        to,
        apiKeyLength: apiKey.length
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
};

// Register
router.post('/register', authRateLimiter, validate(schemas.register), asyncHandler(async (req, res) => {
  const { email, password, username, turnstileToken } = req.body;

  // 1. Verify Turnstile
  const isTurnstileValid = await verifyTurnstile(turnstileToken);
  if (!isTurnstileValid) {
    return res.status(400).json({ error: 'Browser verification (Turnstile) failed. Please try again.' });
  }

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Check username uniqueness
  if (username) {
    const takenByUsername = await User.findOne({ username: username.toLowerCase() });
    if (takenByUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }
  }

  // Create user — use updateOne pattern to avoid username index issues
  const user = await User.create({ email, password, username: username || undefined });

  // Assign Free plan
  const freePlan = await SubscriptionPlan.findOne({ name: 'free' });
  if (freePlan) {
    await User.updateOne({ _id: user._id }, { $set: { plan: freePlan._id, planAssignedAt: new Date() } });
    user.plan = freePlan._id;
    user.planAssignedAt = new Date();
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  res.status(201).json({
    message: 'Registration successful',
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      username: user.username
    }
  });
}));

// Browser Verification Challenge Generator
router.get('/challenge', asyncHandler(async (req, res) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const difficulty = 5000; // Average of 5000 PoW iterations
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  // Signature containing variables signed with access secret
  const expectedData = `${salt}:${difficulty}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', process.env.JWT_ACCESS_SECRET || 'fallback-secret')
    .update(expectedData)
    .digest('hex');

  res.json({ salt, difficulty, expiresAt, signature });
}));

// Login
router.post('/login', authRateLimiter, validate(schemas.login), asyncHandler(async (req, res) => {
  const { email, password, turnstileToken } = req.body;

  // 1. Verify Turnstile
  const isTurnstileValid = await verifyTurnstile(turnstileToken);
  if (!isTurnstileValid) {
    return res.status(400).json({ error: 'Browser verification (Turnstile) failed. Please try again.' });
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or username.' });
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    message: 'Login successful',
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      username: user.username
    }
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json(tokens);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}));

// Logout
router.post('/logout', verifyToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }

  res.json({ message: 'Logout successful' });
}));

// Emergency unlock (secret key required, no auth needed)
router.post('/unlock-account', asyncHandler(async (req, res) => {
  const { email, secret } = req.body;

  if (secret !== process.env.UNLOCK_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await user.resetLoginAttempts();
  res.json({ message: `Account unlocked for ${email}` });
}));

// Get current user
router.get('/me', verifyToken, asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      username: req.user.username,
      createdAt: req.user.createdAt
    }
  });
}));

// Update username
router.patch('/username', verifyToken, validate(schemas.updateUsername), asyncHandler(async (req, res) => {
  const { username } = req.body;
  const normalised = username.toLowerCase();

  const conflict = await User.findOne({ username: normalised, _id: { $ne: req.userId } });
  if (conflict) {
    return res.status(400).json({ error: 'Username already taken' });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.userId,
    { username: normalised },
    { new: true }
  );

  res.json({ user: { id: updatedUser._id, username: updatedUser.username } });
}));

// Forgot Password - Send OTP
router.post('/forgot-password', validate(schemas.forgotPassword), asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({ error: 'This email is not registered.' });
  }

  // Generate 6-digit OTP code (100000 to 999999)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Save OTP to database with 10 minutes expiration
  user.resetPasswordOTP = otp;
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  // Send the email
  const emailSent = await sendOTPEmail(normalizedEmail, otp);
  if (!emailSent) {
    return res.status(500).json({ error: 'Failed to send verification email. Please check server logs or email configuration.' });
  }

  res.json({ message: 'If that email is registered, we have sent a 6-digit verification code.' });
}));

// Reset Password - Verify OTP & update password
router.post('/reset-password', validate(schemas.resetPassword), asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
    resetPasswordOTP: code,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  // Set the new password (pre-save hook will automatically hash it)
  user.password = password;

  // Clear OTP fields
  user.resetPasswordOTP = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.json({ message: 'Your password has been successfully reset.' });
}));

module.exports = router;

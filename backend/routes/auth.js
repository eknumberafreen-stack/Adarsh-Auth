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

const router = express.Router();

// Debug route to test SMTP configuration and output the exact error to the client
router.get('/test-email', asyncHandler(async (req, res) => {
  const nodemailer = require('nodemailer');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || `"Adarsh Auth Security" <${user}>`;

  if (!user || !pass) {
    return res.status(400).json({
      error: 'SMTP credentials not configured in environment variables.',
      envKeysPresent: {
        SMTP_USER: !!user,
        SMTP_PASSWORD: !!pass
      }
    });
  }

  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT) || 587;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  try {
    console.log('[Diagnostic] Verifying connection...');
    await transporter.verify();
    
    console.log('[Diagnostic] Sending test mail...');
    const info = await transporter.sendMail({
      from,
      to: user,
      subject: '🔒 Live SMTP Diagnostic Test',
      text: 'If you received this, your production SMTP settings are working perfectly.'
    });

    return res.json({
      success: true,
      message: 'SMTP settings verified and test email sent successfully!',
      info: {
        messageId: info.messageId,
        envelope: info.envelope
      }
    });
  } catch (error) {
    console.error('[Diagnostic Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      configUsed: {
        user,
        from
      }
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
  const { email, password, username } = req.body;

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
  const { email, password, challenge } = req.body;

  // 1. Verify Browser Challenge
  if (!challenge) {
    return res.status(400).json({ error: 'Browser verification challenge is required' });
  }

  const { nonce, salt, difficulty, expiresAt, signature } = challenge;

  // Verify challenge expiration
  if (Date.now() > expiresAt) {
    return res.status(400).json({ error: 'Browser verification challenge has expired. Please try again.' });
  }

  // Verify challenge signature
  const expectedData = `${salt}:${difficulty}:${expiresAt}`;
  const expectedSignature = crypto.createHmac('sha256', process.env.JWT_ACCESS_SECRET || 'fallback-secret')
    .update(expectedData)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid browser verification challenge signature.' });
  }

  // Verify challenge solution (proof of work)
  const computedHash = slowHash(salt, nonce.toString());
  if (computedHash % difficulty !== 0) {
    return res.status(400).json({ error: 'Invalid browser verification challenge solution.' });
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
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

  req.user.username = normalised;
  await req.user.save();

  res.json({ user: { id: req.user._id, username: req.user.username } });
}));

// Forgot Password - Send OTP
router.post('/forgot-password', validate(schemas.forgotPassword), asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // Return success message to prevent account enumeration but don't try to send email
    return res.json({ message: 'If that email is registered, we have sent a 6-digit verification code.' });
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
    return res.status(500).json({ error: 'Failed to send OTP email. Please verify Gmail SMTP setup in .env' });
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

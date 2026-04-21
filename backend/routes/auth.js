const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { validate, schemas } = require('../middleware/validation');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

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
  const { email, password } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Create user
  const user = await User.create({ email, password });

  // Assign Free plan
  const freePlan = await SubscriptionPlan.findOne({ name: 'free' });
  if (freePlan) {
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
      email: user.email
    }
  });
}));

// Login
router.post('/login', authRateLimiter, validate(schemas.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

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
      email: user.email
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
      createdAt: req.user.createdAt
    }
  });
}));

module.exports = router;

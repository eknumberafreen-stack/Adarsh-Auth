const express = require('express');
const AppUser = require('../models/AppUser');
const Application = require('../models/Application');
const Session = require('../models/Session');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Create user directly from dashboard
router.post('/create', asyncHandler(async (req, res) => {
  const { username, password, email, subscription, expiryDate, hwidAffected, applicationId } = req.body

  if (!username || !password || !applicationId) {
    return res.status(400).json({ error: 'username, password and applicationId are required' })
  }

  const application = await Application.findOne({ _id: applicationId, userId: req.userId })
  if (!application) return res.status(404).json({ error: 'Application not found' })

  const existing = await AppUser.findOne({ username, applicationId })
  if (existing) return res.status(400).json({ error: 'Username already exists' })

  const user = await AppUser.create({
    username,
    password,
    email: email || null,
    subscription: subscription || 'default',
    applicationId,
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    hwidAffected: hwidAffected !== false
  })

  // Update user count
  application.userCount = await AppUser.countDocuments({ applicationId })
  await application.save()

  res.status(201).json({ message: 'User created successfully', user })
}))

// Get all users for application
router.get('/application/:applicationId', asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  // Verify application ownership
  const application = await Application.findOne({
    _id: applicationId,
    userId: req.userId
  });

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const users = await AppUser.find({ applicationId })
    .select('-password')
    .sort({ createdAt: -1 });

  res.json({ users });
}));

// Get single user
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id)
    .select('-password')
    .populate('applicationId');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify application ownership
  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ user });
}));

// Ban user
router.post('/:id/ban', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify application ownership
  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  user.banned = true;
  user.bannedAt = Date.now();
  await user.save();

  // Invalidate all sessions
  await Session.deleteMany({ userId: user._id });

  res.json({
    message: 'User banned successfully',
    user
  });
}));

// Unban user
router.post('/:id/unban', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify application ownership
  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  user.banned = false;
  user.bannedAt = null;
  await user.save();

  res.json({
    message: 'User unbanned successfully',
    user
  });
}));

// Reset HWID
router.post('/:id/reset-hwid', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify application ownership
  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  await user.resetHwid();

  // Invalidate all sessions
  await Session.deleteMany({ userId: user._id });

  res.json({
    message: 'HWID reset successfully',
    user
  });
}));

// Delete user
router.delete('/:id', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify application ownership
  if (user.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Delete user and sessions
  await Promise.all([
    AppUser.deleteOne({ _id: user._id }),
    Session.deleteMany({ userId: user._id })
  ]);

  res.json({ message: 'User deleted successfully' });
}));

module.exports = router;

/**
 * PAYMENT ROUTES — UPI Manual Payment System
 * POST /api/payment/submit   — user submits payment
 * GET  /api/payment/my       — user's own payment history
 * GET  /api/payment/admin    — admin: list all payments
 * POST /api/payment/admin/:id/approve — admin: approve
 * POST /api/payment/admin/:id/reject  — admin: reject
 */

const express          = require('express');
const rateLimit        = require('express-rate-limit');
const Payment          = require('../models/Payment');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const User             = require('../models/User');
const AuditLog         = require('../models/AuditLog');
const { verifyToken, verifyOwner } = require('../middleware/auth');
const { asyncHandler }   = require('../middleware/errorHandler');
const { getRedisClient } = require('../config/redis');

const router = express.Router();

// Rate limit: max 3 payment submissions per user per hour
const paymentSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.userId || req.ip,
  message: { error: 'Too many payment submissions. Please wait before trying again.' }
});

// ── USER: Submit Payment ──────────────────────────────────────
router.post('/submit', verifyToken, paymentSubmitLimiter, asyncHandler(async (req, res) => {
  const { planId, transactionId, screenshotUrl } = req.body;

  // Validate required fields
  if (!planId || !transactionId) {
    return res.status(400).json({ error: 'planId and transactionId are required' });
  }

  const trimmedTxId = transactionId.trim().toUpperCase();
  if (trimmedTxId.length < 6) {
    return res.status(400).json({ error: 'Transaction ID must be at least 6 characters' });
  }

  // Check plan exists
  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found or inactive' });
  }

  // Prevent duplicate transaction IDs globally
  const existing = await Payment.findOne({ transactionId: trimmedTxId });
  if (existing) {
    return res.status(409).json({ error: 'This transaction ID has already been submitted' });
  }

  // Check if user already has a pending payment
  const pendingPayment = await Payment.findOne({ userId: req.userId, status: 'pending' });
  if (pendingPayment) {
    return res.status(409).json({
      error: 'You already have a pending payment. Please wait for it to be reviewed.',
      paymentId: pendingPayment._id
    });
  }

  const payment = await Payment.create({
    userId: req.userId,
    planId: plan._id,
    amount: plan.price,
    transactionId: trimmedTxId,
    screenshotUrl: screenshotUrl || null,
    status: 'pending'
  });

  res.status(201).json({
    message: 'Payment submitted successfully. Admin will verify within 24 hours.',
    payment: {
      _id: payment._id,
      status: payment.status,
      transactionId: payment.transactionId,
      plan: { name: plan.name, displayName: plan.displayName },
      amount: payment.amount,
      createdAt: payment.createdAt
    }
  });
}));

// ── USER: My Payments ─────────────────────────────────────────
router.get('/my', verifyToken, asyncHandler(async (req, res) => {
  const payments = await Payment.find({ userId: req.userId })
    .populate('planId', 'name displayName price')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({ payments });
}));

// ── ADMIN: List All Payments ──────────────────────────────────
router.get('/admin', verifyToken, verifyOwner, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const payments = await Payment.find(filter)
    .populate('userId', 'email username')
    .populate('planId', 'name displayName price')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

  const total = await Payment.countDocuments(filter);
  const pendingCount = await Payment.countDocuments({ status: 'pending' });

  res.json({ payments, total, pendingCount, page: parseInt(page) });
}));

// ── ADMIN: Approve Payment ────────────────────────────────────
router.post('/admin/:id/approve', verifyToken, verifyOwner, asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('planId');
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status !== 'pending') {
    return res.status(400).json({ error: `Payment is already ${payment.status}` });
  }

  const plan = payment.planId;
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  // Activate plan for user
  const user = await User.findById(payment.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.plan = plan._id;
  user.planAssignedAt = new Date();
  await user.save();

  // Update payment status
  payment.status = 'approved';
  payment.reviewedBy = req.user.email;
  payment.reviewedAt = new Date();
  await payment.save();

  // Invalidate Redis plan cache
  try {
    const redis = getRedisClient();
    await redis.del(`plan:${user._id}`);
    await redis.del(`plan:usage:${user._id}`);
  } catch (_) {}

  // Log the action
  try {
    await AuditLog.create({
      applicationId: null,
      action: 'suspicious_activity',
      ip: req.ip,
      severity: 'info',
      details: {
        event: 'payment_approved',
        paymentId: payment._id,
        userId: user._id,
        userEmail: user.email,
        planName: plan.name,
        transactionId: payment.transactionId,
        approvedBy: req.user.email
      }
    });
  } catch (_) {}

  res.json({
    message: `Payment approved. ${plan.displayName} plan activated for ${user.email}`,
    payment: { _id: payment._id, status: payment.status }
  });
}));

// ── ADMIN: Reject Payment ─────────────────────────────────────
router.post('/admin/:id/reject', verifyToken, verifyOwner, asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const payment = await Payment.findById(req.params.id).populate('planId').populate('userId', 'email');
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status !== 'pending') {
    return res.status(400).json({ error: `Payment is already ${payment.status}` });
  }

  payment.status = 'rejected';
  payment.adminNote = reason || 'Payment rejected by admin';
  payment.reviewedBy = req.user.email;
  payment.reviewedAt = new Date();
  await payment.save();

  // Log the action
  try {
    await AuditLog.create({
      applicationId: null,
      action: 'suspicious_activity',
      ip: req.ip,
      severity: 'warning',
      details: {
        event: 'payment_rejected',
        paymentId: payment._id,
        userId: payment.userId._id,
        userEmail: payment.userId.email,
        transactionId: payment.transactionId,
        reason: payment.adminNote,
        rejectedBy: req.user.email
      }
    });
  } catch (_) {}

  res.json({
    message: 'Payment rejected',
    payment: { _id: payment._id, status: payment.status }
  });
}));

module.exports = router;

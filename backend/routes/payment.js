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

// ── USER: Cashfree Create Order ────────────────────────────────
router.post('/cashfree/create-order', verifyToken, asyncHandler(async (req, res) => {
  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ error: 'planId is required' });
  }

  // Check plan exists
  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found or inactive' });
  }

  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ 
      error: 'Cashfree Gateway is not configured by the administrator yet.' 
    });
  }

  // Calculate price: plan.price is in USD cents. Let's convert to INR
  if (plan.price === 0) {
    return res.status(400).json({ error: 'Free plans do not require payment.' });
  }

  const dollars = plan.price / 100;
  const conversionRate = parseFloat(process.env.CASHFREE_CONVERSION_RATE || '83');
  const inrAmount = parseFloat((dollars * conversionRate).toFixed(2));

  // Generate unique order ID
  const orderId = `cf_${plan.name}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Prepare Cashfree API call
  const isProd = process.env.CASHFREE_ENV === 'production';
  const cashfreeUrl = isProd 
    ? 'https://api.cashfree.com/pg/orders' 
    : 'https://sandbox.cashfree.com/pg/orders';

  const payload = {
    order_id: orderId,
    order_amount: inrAmount,
    order_currency: 'INR',
    customer_details: {
      customer_id: req.userId.toString(),
      customer_email: req.user.email || 'customer@example.com',
      customer_phone: '9999999999' // 10 digit fallback required by cashfree
    },
    order_meta: {
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/pay/callback?order_id={order_id}`
    }
  };

  try {
    const response = await fetch(cashfreeUrl, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Cashfree order creation failed:', responseData);
      return res.status(response.status).json({ 
        error: responseData.message || 'Failed to create payment order with Cashfree' 
      });
    }

    // Create a pending Payment record in MongoDB
    await Payment.create({
      userId: req.userId,
      planId: plan._id,
      amount: plan.price, // original USD cents amount
      transactionId: orderId, // use the order ID as transaction ID
      screenshotUrl: 'CASHFREE', // sentinel flag
      status: 'pending'
    });

    res.status(201).json({
      message: 'Cashfree order created successfully',
      orderId,
      paymentSessionId: responseData.payment_session_id,
      orderAmount: inrAmount,
      currency: 'INR',
      cashfreeEnv: process.env.CASHFREE_ENV || 'sandbox'
    });
  } catch (error) {
    console.error('Cashfree Create Order Error:', error);
    res.status(500).json({ error: 'Failed to initiate Cashfree payment.' });
  }
}));

// ── USER: Cashfree Verify Payment ──────────────────────────────
router.post('/cashfree/verify-order', verifyToken, asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  // Find payment record
  const payment = await Payment.findOne({ transactionId: orderId, userId: req.userId }).populate('planId');
  if (!payment) {
    return res.status(404).json({ error: 'Payment order record not found' });
  }

  // If already approved, return success
  if (payment.status === 'approved') {
    return res.json({
      success: true,
      message: 'Payment is already verified and active.',
      status: 'approved'
    });
  }

  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Cashfree Gateway is not configured.' });
  }

  // Prepare Cashfree API call
  const isProd = process.env.CASHFREE_ENV === 'production';
  const cashfreeUrl = isProd 
    ? `https://api.cashfree.com/pg/orders/${orderId}` 
    : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

  try {
    const response = await fetch(cashfreeUrl, {
      method: 'GET',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': '2023-08-01',
        'accept': 'application/json'
      }
    });

    const orderData = await response.json();

    if (!response.ok) {
      console.error('Cashfree verification call failed:', orderData);
      return res.status(response.status).json({ 
        error: orderData.message || 'Failed to verify payment status with Cashfree' 
      });
    }

    if (orderData.order_status === 'PAID') {
      // Payment successful! Let's approve the payment and activate the plan
      const plan = payment.planId;
      if (!plan) return res.status(404).json({ error: 'Plan details not found' });

      const user = await User.findById(payment.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Update User Plan
      user.plan = plan._id;
      user.planAssignedAt = new Date();
      await user.save();

      // Update Payment status
      payment.status = 'approved';
      payment.reviewedBy = 'CASHFREE_PG_AUTO';
      payment.reviewedAt = new Date();
      await payment.save();

      // Invalidate Redis plan cache
      try {
        const redis = getRedisClient();
        await redis.del(`plan:${user._id}`);
        await redis.del(`plan:usage:${user._id}`);
      } catch (_) {}

      // Log to Audit Log
      try {
        await AuditLog.create({
          applicationId: null,
          action: 'suspicious_activity',
          ip: req.ip,
          severity: 'info',
          details: {
            event: 'payment_approved_cashfree',
            paymentId: payment._id,
            userId: user._id,
            userEmail: user.email,
            planName: plan.name,
            transactionId: orderId,
            approvedBy: 'CASHFREE_PG_AUTO'
          }
        });
      } catch (_) {}

      return res.json({
        success: true,
        message: `Payment successful! Your ${plan.displayName} plan is now active.`,
        status: 'approved'
      });
    } else {
      // Not paid (failed, expired, or active/pending)
      return res.json({
        success: false,
        message: `Payment is not completed. Status: ${orderData.order_status}`,
        status: orderData.order_status
      });
    }
  } catch (error) {
    console.error('Cashfree Verification Error:', error);
    res.status(500).json({ error: 'Failed to verify payment status.' });
  }
}));

module.exports = router;

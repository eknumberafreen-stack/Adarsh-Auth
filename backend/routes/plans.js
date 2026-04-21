const express = require('express');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getUserPlanWithUsage } = require('../services/planService');

const router = express.Router();

// GET /api/plans — public; returns all active subscription plans
router.get('/', asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find({ isActive: true });
  res.json({ plans });
}));

// GET /api/plans/my — requires auth; returns the authenticated user's plan and usage
router.get('/my', verifyToken, asyncHandler(async (req, res) => {
  const result = await getUserPlanWithUsage(req.userId);
  res.json(result);
}));

module.exports = router;

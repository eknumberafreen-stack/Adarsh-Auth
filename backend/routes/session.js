const express = require('express');
const Session = require('../models/Session');
const Application = require('../models/Application');
const { verifyToken, verifyAppAccess } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRedisClient } = require('../config/redis');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Helper to verify session permissions when we only have the Session document
const verifySessionActionAccess = async (req, res, session, requiredPermission) => {
  const application = session.applicationId; // Assumes populated
  if (!application) return false;

  // 1. Is Owner?
  if (application.userId.toString() === req.userId.toString()) {
    req.isOwner = true;
    return true;
  }

  // 2. Is Team Member?
  const member = application.team?.find(m => m.userId.toString() === req.userId.toString());
  if (member) {
    // Check if team member has expired
    if (member.expiresAt && new Date(member.expiresAt) < new Date()) {
      return false; // Access expired
    }

    req.isOwner = false;
    req.teamRole = member.role;
    req.teamPermissions = member.permissions;

    if (requiredPermission && !member.permissions.includes(requiredPermission)) {
      return false; // Lacks specific permission
    }
    return true; // Has access
  }

  return false; // Not owner, not team member
};

// Get all sessions for application
router.get('/application/:applicationId', verifyAppAccess(), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  const sessions = await Session.find({ applicationId })
    .populate('userId', 'username lastLogin')
    .sort({ createdAt: -1 });

  res.json({ sessions });
}));

// Terminate session
router.delete('/:id', asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id).populate('applicationId');

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const hasAccess = await verifySessionActionAccess(req, res, session, 'manage_users');
  if (!hasAccess) return res.status(403).json({ error: 'Access denied: You need manage_users permission.' });

  await Session.deleteOne({ _id: session._id });

  // Clean up Redis session entries
  const redis = getRedisClient();
  if (session.sessionToken) await redis.del(`sess:${session.sessionToken}`);
  if (session.userId && session.applicationId) {
    await redis.del(`user_sess:${session.userId}:${session.applicationId}`);
  }
}));

// Terminate all sessions for application
router.delete('/application/:applicationId/all', verifyAppAccess('manage_users'), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  const result = await Session.deleteMany({ applicationId });

  // Clean up Redis sessions for the application
  const redis = getRedisClient();
  const keys = await redis.keys('sess:*');
  for (const key of keys) {
    const sess = await redis.hGetAll(key);
    if (sess && sess.applicationId === applicationId) {
      await redis.del(key);
    }
  }

  res.json({
    message: 'All sessions terminated successfully',
    count: result.deletedCount
  });
}));

module.exports = router;

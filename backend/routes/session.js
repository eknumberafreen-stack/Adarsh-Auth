const express = require('express');
const Session = require('../models/Session');
const Application = require('../models/Application');
const { verifyToken, verifyAppAccess } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRedisClient } = require('../config/redis');
const AppUser = require('../models/AppUser');

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
  const redis = getRedisClient();
  const activeSessions = [];

  const users = await AppUser.find({ applicationId }).select('_id username lastLogin');

  for (const user of users) {
    const userKey = `user_sess:${user._id}:${applicationId}`;
    const token = await redis.get(userKey);
    if (token) {
      const sessionData = await redis.hGetAll(`sess:${token}`);
      if (sessionData && Object.keys(sessionData).length > 0) {
        activeSessions.push({
          _id: token,
          userId: { _id: user._id, username: user.username, lastLogin: user.lastLogin },
          applicationId,
          hwid: sessionData.hwid,
          ip: sessionData.ip,
          ping: sessionData.ping || 'N/A',
          lastHeartbeat: sessionData.lastHeartbeat ? parseInt(sessionData.lastHeartbeat) : Date.now(),
          createdAt: Date.now(), 
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        });
      }
    }
  }

  res.json({ sessions: activeSessions.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat) });
}));

// Terminate session
router.delete('/:id', asyncHandler(async (req, res) => {
  const token = req.params.id;
  const redis = getRedisClient();
  
  const session = await redis.hGetAll(`sess:${token}`);
  if (!session || Object.keys(session).length === 0) {
    return res.status(404).json({ error: 'Session not found' });
  }

  await redis.hSet(`sess:${token}`, 'forceClose', 'true');
  res.json({ message: 'Session terminated successfully (Force close signal sent)' });
}));

// Terminate all sessions for application
router.delete('/application/:applicationId/all', verifyAppAccess('manage_users'), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const redis = getRedisClient();
  const users = await AppUser.find({ applicationId }).select('_id');
  let count = 0;

  for (const user of users) {
    const userKey = `user_sess:${user._id}:${applicationId}`;
    const token = await redis.get(userKey);
    if (token) {
      await redis.hSet(`sess:${token}`, 'forceClose', 'true');
      count++;
    }
  }

  res.json({
    message: 'All sessions terminated successfully',
    count
  });
}));

module.exports = router;

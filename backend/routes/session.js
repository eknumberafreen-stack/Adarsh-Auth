const express = require('express');
const Session = require('../models/Session');
const Application = require('../models/Application');
const { verifyToken, verifyAppAccess } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRedisClient } = require('../config/redis');
const AppUser = require('../models/AppUser');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

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

  // 1. Get all session tokens for this application from the Redis Set
  const tokens = await redis.sMembers(`app_sessions:${applicationId}`);

  // 2. Fetch session data for all tokens in parallel
  const sessionPairs = await Promise.all(tokens.map(async (token) => {
    const sessionData = await redis.hGetAll(`sess:${token}`);
    if (sessionData && Object.keys(sessionData).length > 0) {
      return { token, sessionData };
    } else {
      // Session has expired or been deleted — clean it up from the Set
      await redis.sRem(`app_sessions:${applicationId}`, token);
      return null;
    }
  }));

  const activeSessions = sessionPairs.filter(Boolean);

  // 3. Extract unique user IDs to load AppUser details in a single query
  const userIds = [...new Set(activeSessions.map(s => s.sessionData.userId))];
  const users = await AppUser.find({ _id: { $in: userIds } })
    .select('_id username lastLogin expiryDate')
    .lean();

  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  // 4. Build output
  const sessionDetails = activeSessions.map(item => {
    const { token, sessionData } = item;
    const user = userMap.get(sessionData.userId);
    if (!user) return null;

    return {
      _id: token,
      userId: { _id: user._id, username: user.username, lastLogin: user.lastLogin },
      applicationId,
      hwid: sessionData.hwid,
      ip: sessionData.ip,
      ping: sessionData.ping || 'N/A',
      lastHeartbeat: sessionData.lastHeartbeat ? parseInt(sessionData.lastHeartbeat) : Date.now(),
      createdAt: Date.now(), 
      expiresAt: user.expiryDate ? new Date(user.expiryDate).getTime() : Date.now() + 24 * 60 * 60 * 1000
    };
  }).filter(Boolean);

  res.json({ sessions: sessionDetails.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat) });
}));

// Get terminated session logs for an application
router.get('/application/:applicationId/history', verifyAppAccess(), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {
    applicationId,
    action: { $in: ['session_kicked', 'session_crashed'] }
  };

  const [history, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query)
  ]);

  res.json({
    history,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
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
  await redis.sRem(`app_sessions:${session.applicationId}`, token);

  // Log who did the kick and when
  try {
    const admin = await User.findById(req.userId).select('username email');
    const adminName = admin ? (admin.username || admin.email) : 'Admin';

    const client = await AppUser.findById(session.userId).select('username');
    const clientName = client ? client.username : 'Unknown';

    await AuditLog.create({
      applicationId: session.applicationId,
      userId: session.userId,
      action: 'session_kicked',
      ip: req.ip || '127.0.0.1',
      severity: 'info',
      details: {
        event: 'session_kicked',
        kickedBy: adminName,
        kickedById: req.userId,
        clientUsername: clientName,
        hwid: session.hwid,
        clientIp: session.ip,
        sessionToken: token
      }
    });
  } catch (logErr) {
    console.error('Failed to log session kick:', logErr);
  }

  res.json({ message: 'Session terminated successfully (Force close signal sent)' });
}));

// Terminate all sessions for application
router.delete('/application/:applicationId/all', verifyAppAccess('manage_users'), asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const redis = getRedisClient();
  const tokens = await redis.sMembers(`app_sessions:${applicationId}`);
  let count = 0;

  try {
    const admin = await User.findById(req.userId).select('username email');
    const adminName = admin ? (admin.username || admin.email) : 'Admin';

    for (const token of tokens) {
      const session = await redis.hGetAll(`sess:${token}`);
      if (session && Object.keys(session).length > 0) {
        await redis.hSet(`sess:${token}`, 'forceClose', 'true');
        count++;

        try {
          const client = await AppUser.findById(session.userId).select('username');
          const clientName = client ? client.username : 'Unknown';

          await AuditLog.create({
            applicationId,
            userId: session.userId,
            action: 'session_kicked',
            ip: req.ip || '127.0.0.1',
            severity: 'info',
            details: {
              event: 'session_kicked_all',
              kickedBy: adminName,
              kickedById: req.userId,
              clientUsername: clientName,
              hwid: session.hwid,
              clientIp: session.ip,
              sessionToken: token
            }
          });
        } catch (err) {
          console.error('Error logging kick-all for user:', session.userId, err);
        }
      }
      await redis.sRem(`app_sessions:${applicationId}`, token);
    }
  } catch (adminErr) {
    console.error('Failed to get admin details for global termination:', adminErr);
  }

  res.json({
    message: 'All sessions terminated successfully',
    count
  });
}));

module.exports = router;

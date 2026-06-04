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

  const users = await AppUser.find({ applicationId })
    .select('_id username lastLogin expiryDate')
    .lean();

  // Run user session token lookups in parallel
  const userSessionsList = await Promise.all(users.map(async (user) => {
    const userKey = `user_sessions:${user._id}:${applicationId}`;
    const tokens = await redis.sMembers(userKey);
    return { user, tokens: tokens || [] };
  }));

  // Flatten active session tokens
  const activeTokens = [];
  userSessionsList.forEach(({ user, tokens }) => {
    tokens.forEach(token => {
      activeTokens.push({ user, token });
    });
  });
  
  const sessionDetails = await Promise.all(activeTokens.map(async (item) => {
    const { user, token } = item;
    const sessionData = await redis.hGetAll(`sess:${token}`);
    if (sessionData && Object.keys(sessionData).length > 0) {
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
    } else {
      // Clean up orphaned/expired token from user set
      redis.sRem(`user_sessions:${user._id}:${applicationId}`, token).catch(() => {});
      return null;
    }
  }));

  const validSessions = sessionDetails.filter(Boolean);

  // Group the validSessions by user._id
  const userGroups = {};
  for (const session of validSessions) {
    const userIdStr = session.userId._id.toString();
    if (!userGroups[userIdStr]) {
      userGroups[userIdStr] = [];
    }
    userGroups[userIdStr].push(session);
  }

  // Map each group to a single row
  const groupedSessions = Object.values(userGroups).map(sessionsForUser => {
    const first = sessionsForUser[0];
    const count = sessionsForUser.length;

    // Take the most recent heartbeat of all their sessions
    const lastHeartbeat = Math.max(...sessionsForUser.map(s => s.lastHeartbeat));

    // Compile unique IPs and HWIDs
    const uniqueIps = [...new Set(sessionsForUser.map(s => s.ip).filter(Boolean))];
    const uniqueHwids = [...new Set(sessionsForUser.map(s => s.hwid).filter(Boolean))];

    // Calculate average ping
    const pings = sessionsForUser.map(s => s.ping).filter(p => p && p !== 'N/A').map(p => parseInt(p));
    const avgPing = pings.length > 0 ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) + ' ms' : 'N/A';

    return {
      _id: first.userId._id.toString(), // Group ID is the User ID
      userId: {
        _id: first.userId._id,
        username: count > 1 ? `${first.userId.username} (${count} active)` : first.userId.username,
        lastLogin: first.userId.lastLogin
      },
      applicationId: first.applicationId,
      hwid: uniqueHwids.join(', '),
      ip: uniqueIps.join(', '),
      ping: avgPing,
      lastHeartbeat,
      createdAt: first.createdAt,
      expiresAt: first.expiresAt
    };
  });

  res.json({ sessions: groupedSessions.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat) });
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
  const paramId = req.params.id;
  const redis = getRedisClient();
  
  // If paramId is 24 characters (a MongoDB ObjectId), it is a User ID.
  // Terminate ALL sessions for this user.
  if (paramId.length === 24) {
    const user = await AppUser.findById(paramId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userKey = `user_sessions:${user._id}:${user.applicationId}`;
    const tokens = await redis.sMembers(userKey);

    if (tokens && tokens.length > 0) {
      const admin = await User.findById(req.userId).select('username email');
      const adminName = admin ? (admin.username || admin.email) : 'Admin';

      for (const token of tokens) {
        const session = await redis.hGetAll(`sess:${token}`);
        if (session && Object.keys(session).length > 0) {
          await redis.hSet(`sess:${token}`, 'forceClose', 'true');

          try {
            await AuditLog.create({
              applicationId: user.applicationId,
              userId: user._id,
              action: 'session_kicked',
              ip: req.ip || '127.0.0.1',
              severity: 'info',
              details: {
                event: 'session_kicked',
                kickedBy: adminName,
                kickedById: req.userId,
                clientUsername: user.username,
                hwid: session.hwid,
                clientIp: session.ip,
                sessionToken: token
              }
            });
          } catch (logErr) {
            console.error('Failed to log session kick:', logErr);
          }
        }
      }
    }

    return res.json({ message: 'All sessions for this user terminated successfully (Force close signals sent)' });
  }

  // Otherwise, fallback to single session token deletion (if length is 64 characters)
  const token = paramId;
  const session = await redis.hGetAll(`sess:${token}`);
  if (!session || Object.keys(session).length === 0) {
    return res.status(404).json({ error: 'Session not found' });
  }

  await redis.hSet(`sess:${token}`, 'forceClose', 'true');

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
  const users = await AppUser.find({ applicationId }).select('_id');
  let count = 0;

  try {
    const admin = await User.findById(req.userId).select('username email');
    const adminName = admin ? (admin.username || admin.email) : 'Admin';

    for (const user of users) {
      const userKey = `user_sessions:${user._id}:${applicationId}`;
      const tokens = await redis.sMembers(userKey);
      if (tokens && tokens.length > 0) {
        for (const token of tokens) {
          const session = await redis.hGetAll(`sess:${token}`);
          await redis.hSet(`sess:${token}`, 'forceClose', 'true');
          count++;

          try {
            const client = await AppUser.findById(user._id).select('username');
            const clientName = client ? client.username : 'Unknown';

            await AuditLog.create({
              applicationId,
              userId: user._id,
              action: 'session_kicked',
              ip: req.ip || '127.0.0.1',
              severity: 'info',
              details: {
                event: 'session_kicked_all',
                kickedBy: adminName,
                kickedById: req.userId,
                clientUsername: clientName,
                hwid: session ? session.hwid : 'N/A',
                clientIp: session ? session.ip : 'N/A',
                sessionToken: token
              }
            });
          } catch (err) {
            console.error('Error logging kick-all for user:', user._id, err);
          }
        }
      }
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

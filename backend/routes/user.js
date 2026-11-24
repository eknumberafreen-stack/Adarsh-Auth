const express = require('express');
const mongoose = require('mongoose');
const AppUser = require('../models/AppUser');
const License = require('../models/License');
const Session = require('../models/Session');
const IPBan = require('../models/IPBan');
const AuditLog = require('../models/AuditLog');
const Application = require('../models/Application');
const User = require('../models/User');
const { verifyToken, verifyAppAccess } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRedisClient } = require('../config/redis');
const { checkPlanLimit } = require('../middleware/planLimit');
const { isProtectedProxyOrPrivateIp, normalizeIp } = require('../utils/ip');

const router = express.Router();
router.use(verifyToken);

const escapeRegex = (str = '') => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSafeRedis = () => {
  try {
    return getRedisClient();
  } catch {
    return null;
  }
};

// Shared user filter builder so paginated list and bulk operations match identically
const buildUserFilter = (applicationId, { search = '', status = 'all' } = {}) => {
  const andClauses = [{ applicationId }];
  const trimmedSearch = String(search || '').trim();
  if (trimmedSearch) {
    const regex = { $regex: escapeRegex(trimmedSearch), $options: 'i' };
    andClauses.push({
      $or: [
        { username: regex },
        { email: regex },
        { hwid: regex },
        { lastIp: regex }
      ]
    });
  }

  const now = new Date();
  switch (String(status || 'all').toLowerCase()) {
    case 'banned':
      andClauses.push({ banned: true });
      break;
    case 'paused':
      andClauses.push({ banned: { $ne: true }, paused: true });
      break;
    case 'expired':
      andClauses.push({
        banned: { $ne: true },
        paused: { $ne: true },
        expiryDate: { $ne: null, $lt: now }
      });
      break;
    case 'active':
      andClauses.push({
        banned: { $ne: true },
        paused: { $ne: true },
        $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }]
      });
      break;
    default:
      break;
  }

  return andClauses.length === 1 ? andClauses[0] : { $and: andClauses };
};

// Helper to verify user permissions when we only have the AppUser document
const verifyUserActionAccess = async (req, res, appUser, requiredPermission) => {
  const application = appUser.applicationId; // Assumes populated
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

// ─── Get online status for all users of an application ───────────────────────
router.get('/application/:applicationId/online-status', verifyAppAccess(), asyncHandler(async (req, res) => {
  const redis = getRedisClient();
  const appId = req.params.applicationId;

  // Get all users in this app to know which user IDs to check
  const users = await AppUser.find({ applicationId: appId }).select('_id').lean();

  const HEARTBEAT_TIMEOUT_MS = 30_000; // 30s — generous since heartbeat is 3s
  const onlineUserIds = [];

  await Promise.all(users.map(async (user) => {
    const userKey = `user_sessions:${user._id}:${appId}`;
    const tokens = await redis.sMembers(userKey);
    if (!tokens || tokens.length === 0) return;

    for (const token of tokens) {
      const session = await redis.hGetAll(`sess:${token}`);
      if (!session || !session.lastHeartbeat) continue;

      const timeSince = Date.now() - parseInt(session.lastHeartbeat);
      if (timeSince <= HEARTBEAT_TIMEOUT_MS) {
        onlineUserIds.push({
          userId: user._id.toString(),
          ping: session.ping || null
        });
        break; // Count user as online if at least one session is active
      }
    }
  }));

  res.json({ online: onlineUserIds });
}));

// ─── Get all users for application (with pagination, search & status filter) ─

router.get('/application/:applicationId', verifyAppAccess(), asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const search = req.query.search || '';
  const status = req.query.status || 'all';
  const skip = (page - 1) * limit;

  const filter = buildUserFilter(req.params.applicationId, { search, status });

  const [users, total] = await Promise.all([
    AppUser.find(filter)
      .select('-password')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AppUser.countDocuments(filter)
  ]);

  res.json({ 
    users,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
}));

// ─── Bulk user actions (pause, unpause, reset-hwid, force-close, bans, extend, delete)
router.post('/application/:applicationId/bulk', verifyAppAccess('manage_users'), asyncHandler(async (req, res) => {
  const {
    action,
    userIds = [],
    selectAllMatching = false,
    search = '',
    status = 'all',
    payload = {}
  } = req.body || {};

  const allowedActions = [
    'pause',
    'unpause',
    'reset-hwid',
    'force-close',
    'soft-ban',
    'ban',
    'unban',
    'extend-time',
    'delete'
  ];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: `Invalid bulk action: ${action}` });
  }

  if (!selectAllMatching && (!Array.isArray(userIds) || userIds.length === 0)) {
    return res.status(400).json({ error: 'Select at least one user to perform bulk action' });
  }

  const validUserIds = selectAllMatching
    ? []
    : [...new Set(userIds.map(String))].filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!selectAllMatching && validUserIds.length === 0) {
    return res.status(400).json({ error: 'No valid user IDs provided' });
  }

  const appId = req.params.applicationId;
  const targetFilter = selectAllMatching
    ? buildUserFilter(appId, { search, status })
    : { _id: { $in: validUserIds }, applicationId: appId };

  const targetUsers = await AppUser.find(targetFilter);
  if (targetUsers.length === 0) {
    return res.status(404).json({ error: 'No matching users found in this application' });
  }

  const targetIds = targetUsers.map(u => u._id);
  const redis = getSafeRedis();
  let affected = 0;
  let extra = {};

  switch (action) {
    case 'pause': {
      const unpaused = targetUsers.filter(u => !u.paused);
      const nowMinusOne = new Date(Date.now() - 1000);
      await Promise.all(unpaused.map(u => {
        u.paused = true;
        u.pausedExpiry = u.expiryDate;
        u.expiryDate = nowMinusOne;
        return u.save();
      }));
      if (unpaused.length > 0) {
        await Session.deleteMany({ userId: { $in: unpaused.map(u => u._id) } });
      }
      affected = unpaused.length;
      extra = { skippedAlreadyPaused: targetUsers.length - unpaused.length };
      break;
    }

    case 'unpause': {
      const paused = targetUsers.filter(u => u.paused);
      await Promise.all(paused.map(u => {
        u.paused = false;
        u.expiryDate = u.pausedExpiry;
        u.pausedExpiry = null;
        return u.save();
      }));
      affected = paused.length;
      extra = { skippedNotPaused: targetUsers.length - paused.length };
      break;
    }

    case 'reset-hwid': {
      const result = await AppUser.updateMany(
        { _id: { $in: targetIds }, applicationId: appId },
        { $set: { hwid: null }, $inc: { hwidResetCount: 1 } }
      );
      await Session.deleteMany({ userId: { $in: targetIds } });
      affected = result.modifiedCount ?? targetIds.length;
      break;
    }

    case 'force-close': {
      if (!redis) {
        return res.status(503).json({ error: 'Session store unavailable for crash command' });
      }
      const admin = await User.findById(req.userId).select('username email');
      const adminName = admin ? (admin.username || admin.email) : 'Admin';
      let crashedUsers = 0;
      let sessionsClosed = 0;

      for (const user of targetUsers) {
        const userKey = `user_sessions:${user._id}:${appId}`;
        const tokens = await redis.sMembers(userKey);
        if (!tokens || tokens.length === 0) continue;

        let userHadActive = false;
        for (const token of tokens) {
          const session = await redis.hGetAll(`sess:${token}`);
          if (session && Object.keys(session).length > 0) {
            await redis.hSet(`sess:${token}`, 'forceClose', 'true');
            userHadActive = true;
            sessionsClosed++;
            try {
              await AuditLog.create({
                applicationId: appId,
                userId: user._id,
                action: 'session_crashed',
                ip: req.ip || '127.0.0.1',
                severity: 'info',
                details: {
                  event: 'session_crashed_bulk',
                  crashedBy: adminName,
                  crashedById: req.userId,
                  clientUsername: user.username,
                  hwid: session.hwid || user.hwid,
                  clientIp: session.ip || user.lastIp,
                  sessionToken: token
                }
              });
            } catch (logErr) {
              console.error('Failed to log bulk session crash:', logErr);
            }
          }
        }
        if (userHadActive) crashedUsers++;
      }

      if (crashedUsers === 0) {
        return res.status(404).json({ error: 'None of the selected users are currently online' });
      }
      affected = crashedUsers;
      extra = {
        sessionsClosed,
        offlineSkipped: targetUsers.length - crashedUsers
      };
      break;
    }

    case 'soft-ban':
    case 'ban': {
      const isSoftBan = action === 'soft-ban';
      const reason = String(payload.reason || (isSoftBan ? 'Soft ban (bulk)' : 'Manual ban (bulk)')).trim();
      const banMessage = isSoftBan ? null : (payload.banMessage || null);
      const banIp = !isSoftBan && Boolean(payload.banIp);

      await AppUser.updateMany(
        { _id: { $in: targetIds }, applicationId: appId },
        {
          $set: {
            banned: true,
            bannedAt: new Date(),
            banReason: reason,
            banMessage
          }
        }
      );

      let licensesBlacklisted = 0;
      if (!isSoftBan) {
        const licenses = await License.find({
          usedBy: { $in: targetIds },
          applicationId: appId
        });
        for (const license of licenses) {
          license.blacklist(reason);
          await license.save();
        }
        licensesBlacklisted = licenses.length;
      }

      await Session.deleteMany({ userId: { $in: targetIds } });

      let ipsBanned = 0;
      let protectedIpsSkipped = 0;
      if (banIp) {
        const uniqueIps = [...new Set(targetUsers.map(u => normalizeIp(u.lastIp)).filter(Boolean))];
        for (const ip of uniqueIps) {
          if (isProtectedProxyOrPrivateIp(ip)) {
            protectedIpsSkipped++;
            continue;
          }
          await IPBan.findOneAndUpdate(
            { ip },
            { ip, reason: `Bulk user ban: ${reason}`, bannedBy: req.userId, applicationId: appId },
            { upsert: true, new: true }
          );
          if (redis) await redis.del(`ipban:${ip}`).catch(() => {});
          ipsBanned++;
        }
      }

      await AuditLog.insertMany(
        targetUsers.map(u => ({
          applicationId: appId,
          userId: u._id,
          action: 'login_failed',
          ip: req.ip || '127.0.0.1',
          severity: isSoftBan ? 'warning' : 'critical',
          details: {
            event: isSoftBan ? 'user_soft_banned_bulk' : 'user_permanent_banned_bulk',
            reason,
            ipBanned: banIp && !!u.lastIp && !isProtectedProxyOrPrivateIp(u.lastIp)
          }
        }))
      );

      affected = targetUsers.length;
      extra = { licensesBlacklisted, ipsBanned, protectedIpsSkipped };
      break;
    }

    case 'unban': {
      await AppUser.updateMany(
        { _id: { $in: targetIds }, applicationId: appId },
        {
          $set: {
            banned: false,
            bannedAt: null,
            banReason: null,
            banMessage: null
          }
        }
      );
      affected = targetUsers.length;
      break;
    }

    case 'extend-time': {
      const days = Number(payload.days) || 0;
      const hours = Number(payload.hours) || 0;
      const makeLifetime = Boolean(payload.makeLifetime);
      const addMs = (days * 24 + hours) * 60 * 60 * 1000;

      if (!makeLifetime && (!Number.isFinite(addMs) || addMs <= 0)) {
        return res.status(400).json({ error: 'Specify positive days/hours or select Lifetime' });
      }

      let updated = 0;
      let skippedLifetime = 0;
      const now = Date.now();

      for (const u of targetUsers) {
        const expiryField = u.paused ? 'pausedExpiry' : 'expiryDate';
        if (u[expiryField] === null) {
          skippedLifetime++;
          continue;
        }
        if (makeLifetime) {
          u[expiryField] = null;
        } else {
          const base = Math.max(new Date(u[expiryField]).getTime(), now);
          u[expiryField] = new Date(base + addMs);
        }
        await u.save();
        updated++;
      }

      affected = updated;
      extra = { skippedLifetime };
      break;
    }

    case 'delete': {
      const delRes = await AppUser.deleteMany({ _id: { $in: targetIds }, applicationId: appId });
      await Session.deleteMany({ userId: { $in: targetIds } });
      req.application.userCount = await AppUser.countDocuments({ applicationId: appId });
      await req.application.save();
      affected = delRes.deletedCount ?? targetIds.length;
      break;
    }
  }

  res.json({
    message: `Bulk action '${action}' completed`,
    action,
    totalMatched: targetUsers.length,
    affected,
    ...extra
  });
}));

// ─── Create user directly from dashboard ─────────────────────────────────────
router.post('/create',
  verifyAppAccess('manage_users'),
  (req, res, next) => { req.params.id = req.body.applicationId; next(); },
  checkPlanLimit('usersPerApp'),
  asyncHandler(async (req, res) => {
    const { username, password, email, subscription, expiryDate, hwidAffected, applicationId } = req.body;

    if (!username || !password || !applicationId) {
      return res.status(400).json({ error: 'username, password and applicationId are required' });
    }

    if (expiryDate) {
      const d = new Date(expiryDate);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid expiration date' });

      // Strict date check: Prevent rollover (e.g. April 31 -> May 1)
      const digits = expiryDate.match(/\d+/g);
      if (digits && digits.length >= 3) {
        let y = parseInt(digits[0]), m = parseInt(digits[1]), day = parseInt(digits[2]);
        if (y < 1000 && parseInt(digits[2]) > 1000) { // DD-MM-YYYY
          day = parseInt(digits[0]); m = parseInt(digits[1]); y = parseInt(digits[2]);
        }
        if (d.getFullYear() !== y || (d.getMonth() + 1) !== m || d.getDate() !== day) {
          return res.status(400).json({ error: 'The selected date does not exist (e.g. April 31st)' });
        }
      }

      if (d <= new Date()) return res.status(400).json({ error: 'Expiration date must be in the future' });
    }

    const application = req.application; // from verifyAppAccess

    const existing = await AppUser.findOne({ username, applicationId });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const user = await AppUser.create({
      username,
      password,
      email: email || null,
      subscription: subscription || 'default',
      applicationId,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      hwidAffected: hwidAffected !== false,
      createdBy: req.userId
    });

    application.userCount = await AppUser.countDocuments({ applicationId });
    await application.save();

    res.status(201).json({ message: 'User created successfully', user });
  }));

// ─── IP Ban management (placed before /:id routes to avoid Express param collisions)
const getVisibleIpBanFilter = async (req) => {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail || req.user?.email === ownerEmail) {
    return {};
  }
  const ownedApps = await Application.find({ userId: req.userId }).select('_id team.userId').lean();
  const appIds = ownedApps.map((a) => a._id);
  const teamIds = ownedApps.flatMap((a) => (a.team || []).map((m) => m.userId)).filter(Boolean);
  return {
    $or: [
      { bannedBy: req.userId },
      { bannedBy: null },
      ...(teamIds.length > 0 ? [{ bannedBy: { $in: teamIds } }] : []),
      ...(appIds.length > 0 ? [{ applicationId: { $in: appIds } }] : []),
    ],
  };
};

router.get('/ip-bans', asyncHandler(async (req, res) => {
  const filter = await getVisibleIpBanFilter(req);
  const bans = await IPBan.find(filter).sort({ createdAt: -1 }).lean();
  res.json({
    bans: bans.map((b) => ({
      ...b,
      isProtectedProxy: isProtectedProxyOrPrivateIp(b.ip),
    })),
  });
}));

router.post('/ip-bans', asyncHandler(async (req, res) => {
  const ip = normalizeIp(req.body?.ip);
  const reason = req.body?.reason;
  if (!ip) return res.status(400).json({ error: 'IP is required' });
  if (isProtectedProxyOrPrivateIp(ip)) {
    return res.status(400).json({
      error: 'Cannot ban a protected proxy, Cloudflare, or private network IP address',
    });
  }

  const ban = await IPBan.findOneAndUpdate(
    { ip },
    { ip, reason: reason || 'Manual ban', bannedBy: req.userId },
    { upsert: true, new: true }
  );

  const redis = getSafeRedis();
  if (redis) await redis.del(`ipban:${ip}`).catch(() => {});

  res.json({ message: 'IP banned', ban });
}));

router.delete('/ip-bans', asyncHandler(async (req, res) => {
  const filter = await getVisibleIpBanFilter(req);
  const toDelete = await IPBan.find(filter).select('ip').lean();
  const ips = toDelete.map((b) => b.ip);

  if (ips.length > 0) {
    await IPBan.deleteMany({ ip: { $in: ips } });
    const redis = getSafeRedis();
    if (redis) {
      await Promise.all(ips.map((ip) => redis.del(`ipban:${ip}`).catch(() => {})));
    }
  }

  res.json({ message: `Cleared ${ips.length} IP ban(s)`, cleared: ips.length });
}));

router.delete('/ip-bans/:ip', asyncHandler(async (req, res) => {
  const ip = normalizeIp(decodeURIComponent(req.params.ip || ''));
  const filter = await getVisibleIpBanFilter(req);
  await IPBan.deleteOne({ $and: [filter, { ip }] });

  const redis = getSafeRedis();
  if (redis) await redis.del(`ipban:${ip}`).catch(() => {});

  res.json({ message: 'IP ban removed', ip });
}));

// ─── BAN (soft or permanent) ──────────────────────────────────────────────────
router.post('/:id/ban', asyncHandler(async (req, res) => {
  const { reason = 'Manual ban', banIp = false, banMessage = '', softBan = false } = req.body;

  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hasAccess = await verifyUserActionAccess(req, res, user, 'manage_users');
  if (!hasAccess) return res.status(403).json({ error: 'Access denied: You need manage_users permission.' });

  // 1. Ban user
  user.banned = true;
  user.bannedAt = new Date();
  user.banReason = reason;
  user.banMessage = banMessage || null;
  await user.save();

  let blacklistedCount = 0;

  // 2. Permanent ban → blacklist licenses (survives PC reset)
  if (!softBan) {
    const licenses = await License.find({
      usedBy: user._id,
      applicationId: user.applicationId._id
    });
    for (const license of licenses) {
      license.blacklist(reason);
      await license.save();
    }
    blacklistedCount = licenses.length;
  }

  // 3. Kill all sessions
  await Session.deleteMany({ userId: user._id });

  // 4. Optionally ban IP (skip protected proxy / Cloudflare / private IPs)
  const targetIp = normalizeIp(user.lastIp);
  let ipWasBanned = false;
  if (banIp && targetIp && !isProtectedProxyOrPrivateIp(targetIp)) {
    await IPBan.findOneAndUpdate(
      { ip: targetIp },
      { ip: targetIp, reason: `User ban: ${reason}`, bannedBy: req.userId, applicationId: user.applicationId._id },
      { upsert: true, new: true }
    );
    const redis = getSafeRedis();
    if (redis) await redis.del(`ipban:${targetIp}`).catch(() => {});
    ipWasBanned = true;
  }

  await AuditLog.create({
    applicationId: user.applicationId._id,
    userId: user._id,
    action: 'login_failed',
    ip: req.ip,
    severity: softBan ? 'warning' : 'critical',
    details: {
      event: softBan ? 'user_soft_banned' : 'user_permanent_banned',
      reason,
      licensesBlacklisted: blacklistedCount,
      ipBanned: ipWasBanned
    }
  });

  res.json({
    message: softBan ? 'User soft banned (PC reset = access)' : 'User permanently banned',
    licensesBlacklisted: blacklistedCount,
    ipBanned: ipWasBanned
  });
}));

// ─── Edit user ────────────────────────────────────────────────────────────────
router.patch('/:id/edit', asyncHandler(async (req, res) => {
  const { username, email, subscription, expiryDate, hwidAffected } = req.body;
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hasAccess = await verifyUserActionAccess(req, res, user, 'manage_users');
  if (!hasAccess) return res.status(403).json({ error: 'Access denied: You need manage_users permission.' });

  if (expiryDate) {
    const d = new Date(expiryDate);
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid expiration date' });

    // Strict date check: Prevent rollover
    const digits = expiryDate.match(/\d+/g);
    if (digits && digits.length >= 3) {
      let y = parseInt(digits[0]), m = parseInt(digits[1]), day = parseInt(digits[2]);
      if (y < 1000 && parseInt(digits[2]) > 1000) { // DD-MM-YYYY
        day = parseInt(digits[0]); m = parseInt(digits[1]); y = parseInt(digits[2]);
      }
      if (d.getFullYear() !== y || (d.getMonth() + 1) !== m || d.getDate() !== day) {
        return res.status(400).json({ error: 'The selected date does not exist (e.g. April 31st)' });
      }
    }

    if (d <= new Date()) return res.status(400).json({ error: 'Expiration date must be in the future' });
  }

  if (username) user.username = username;
  if (email !== undefined) user.email = email || null;
  if (subscription) user.subscription = subscription;
  if (expiryDate !== undefined) user.expiryDate = expiryDate ? new Date(expiryDate) : null;
  if (hwidAffected !== undefined) user.hwidAffected = hwidAffected;
  await user.save();
  res.json({ message: 'User updated', user });
}));

// ─── Pause user ───────────────────────────────────────────────────────────────
router.patch('/:id/pause', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hasAccess = await verifyUserActionAccess(req, res, user, 'manage_users');
  if (!hasAccess) return res.status(403).json({ error: 'Access denied: You need manage_users permission.' });

  if (!user.paused) {
    user.paused = true;
    user.pausedExpiry = user.expiryDate; // Store the actual date
    user.expiryDate = new Date(Date.now() - 1000); // Set to expired for blocking
    await user.save();
  }
  await Session.deleteMany({ userId: user._id });
  res.json({ message: 'User paused' });
}));

// ─── Unpause user ─────────────────────────────────────────────────────────────
router.patch('/:id/unpause', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hasAccess = await verifyUserActionAccess(req, res, user, 'manage_users');
  if (!hasAccess) return res.status(403).json({ error: 'Access denied: You need manage_users permission.' });

  if (user.paused) {
    user.paused = false;
    user.expiryDate = user.pausedExpiry; // Restore from backup
    user.pausedExpiry = null; // Clear backup
    await user.save();
  }
  res.json({ message: 'User unpaused' });
}));

// ─── Unban user ───────────────────────────────────────────────────────────────
router.post('/:id/unban', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hasAccess = await verifyUserActionAccess(req, res, user, 'manage_users');
  if (!hasAccess) return res.status(403).json({ error: 'Access denied: You need manage_users permission.' });

  user.banned = false;
  user.bannedAt = null;
  user.banReason = null;
  user.banMessage = null;
  await user.save();

  res.json({ message: 'User unbanned successfully' });
}));

// ─── Reset HWID ───────────────────────────────────────────────────────────────
router.post('/:id/reset-hwid', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hasAccess = await verifyUserActionAccess(req, res, user, 'manage_users');
  if (!hasAccess) return res.status(403).json({ error: 'Access denied: You need manage_users permission.' });

  await user.resetHwid();
  await Session.deleteMany({ userId: user._id });

  res.json({ message: 'HWID reset successfully' });
}));

// ─── Force Close User Executable ──────────────────────────────────────────────
router.post('/:id/force-close', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hasAccess = await verifyUserActionAccess(req, res, user, 'manage_users');
  if (!hasAccess) return res.status(403).json({ error: 'Access denied: You need manage_users permission.' });

  const redis = require('../config/redis').getRedisClient();
  const userKey = `user_sessions:${user._id}:${user.applicationId._id}`;
  const tokens = await redis.sMembers(userKey);
  
  if (tokens && tokens.length > 0) {
    let sentCount = 0;
    for (const token of tokens) {
      const session = await redis.hGetAll(`sess:${token}`);
      if (session && Object.keys(session).length > 0) {
        await redis.hSet(`sess:${token}`, 'forceClose', 'true');
        sentCount++;

        // Log the crash action
        try {
          const admin = await User.findById(req.userId).select('username email');
          const adminName = admin ? (admin.username || admin.email) : 'Admin';

          await AuditLog.create({
            applicationId: user.applicationId._id,
            userId: user._id,
            action: 'session_crashed',
            ip: req.ip || '127.0.0.1',
            severity: 'info',
            details: {
              event: 'session_crashed',
              crashedBy: adminName,
              crashedById: req.userId,
              clientUsername: user.username,
              hwid: session ? session.hwid : user.hwid,
              clientIp: session ? session.ip : user.lastIp,
              sessionToken: token
            }
          });
        } catch (logErr) {
          console.error('Failed to log session crash:', logErr);
        }
      }
    }
    if (sentCount > 0) {
      return res.json({ message: 'Crash command sent successfully to all active sessions' });
    }
  }

  res.status(404).json({ error: 'User is not currently online' });
}));

// ─── Delete user ──────────────────────────────────────────────────────────────
router.delete('/:id', asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hasAccess = await verifyUserActionAccess(req, res, user, 'manage_users');
  if (!hasAccess) return res.status(403).json({ error: 'Access denied: You need manage_users permission.' });

  const appId = user.applicationId._id;
  await Promise.all([
    AppUser.deleteOne({ _id: user._id }),
    Session.deleteMany({ userId: user._id })
  ]);

  if (user.applicationId) {
    user.applicationId.userCount = await AppUser.countDocuments({ applicationId: appId });
    await user.applicationId.save();
  }

  res.json({ message: 'User deleted successfully' });
}));

module.exports = router;

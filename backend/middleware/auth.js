const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Application = require('../models/Application');

// Verify JWT access token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ error: 'Access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Verify user still exists
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    req.userId = decoded.userId;

    // Ensure user has an ownerId (for existing users)
    if (!user.ownerId) {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 10; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      user.ownerId = result;
      await user.save();
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Only allow platform owner
const verifyOwner = (req, res, next) => {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return next(); // if not set, allow (dev mode)
  if (req.user?.email !== ownerEmail) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// Check if user is owner or has specific team permission
const verifyAppAccess = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // The appId might be in req.params.applicationId, req.body.applicationId, or req.params.id
      const appId = req.params.applicationId || req.body.applicationId || req.params.id;
      
      if (!appId) {
        return res.status(400).json({ error: 'Application ID is required' });
      }

      const application = await Application.findById(appId);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Check if user is the absolute owner
      if (application.userId.toString() === req.userId.toString()) {
        req.application = application; // pass to next middleware to save DB calls
        req.isOwner = true;
        return next();
      }

      // Check if user is in the team
      const teamMember = application.team.find(m => m.userId.toString() === req.userId.toString());
      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied. You do not own this app and are not on the team.' });
      }

      // Check if they have the required permission
      if (requiredPermission && !teamMember.permissions.includes(requiredPermission)) {
        return res.status(403).json({ error: `Access denied. Requires '${requiredPermission}' permission.` });
      }

      // Allow access!
      req.application = application;
      req.isOwner = false;
      req.teamRole = teamMember.role;
      next();
    } catch (error) {
      console.error('App access error:', error);
      res.status(500).json({ error: 'Server error checking permissions' });
    }
  };
};

module.exports = { verifyToken, verifyOwner, verifyAppAccess };

const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = { verifyToken, verifyOwner };

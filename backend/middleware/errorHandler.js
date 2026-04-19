const AuditLog = require('../models/AuditLog');

// Generic error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Log critical errors
  if (err.severity === 'critical') {
    AuditLog.create({
      action: 'suspicious_activity',
      ip: req.ip,
      details: { error: err.message },
      severity: 'critical'
    }).catch(console.error);
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(err.statusCode || 500).json({
      error: 'An error occurred'
    });
  }

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, asyncHandler };

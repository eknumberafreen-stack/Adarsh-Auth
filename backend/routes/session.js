const express = require('express');
const Session = require('../models/Session');
const Application = require('../models/Application');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all sessions for application
router.get('/application/:applicationId', asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  // Verify application ownership
  const application = await Application.findOne({
    _id: applicationId,
    userId: req.userId
  });

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

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

  // Verify application ownership
  if (session.applicationId.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  await Session.deleteOne({ _id: session._id });

  res.json({ message: 'Session terminated successfully' });
}));

// Terminate all sessions for application
router.delete('/application/:applicationId/all', asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  // Verify application ownership
  const application = await Application.findOne({
    _id: applicationId,
    userId: req.userId
  });

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const result = await Session.deleteMany({ applicationId });

  res.json({
    message: 'All sessions terminated successfully',
    count: result.deletedCount
  });
}));

module.exports = router;

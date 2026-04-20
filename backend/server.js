const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
require('dotenv').config();

const connectDB = require('./config/database');
const connectRedis = require('./config/redis');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { sanitizeMiddleware } = require('./utils/sanitize');
const { checkIPBan } = require('./middleware/ipBan');

// Import routes
const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/application');
const licenseRoutes = require('./routes/license');
const userRoutes = require('./routes/user');
const clientAuthRoutes = require('./routes/clientAuth');
const sessionRoutes = require('./routes/session');
const googleAuthRoutes = require('./routes/googleAuth');

const app = express();

app.use(helmet());
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Sanitize all inputs (NoSQL injection prevention)
app.use(sanitizeMiddleware);

// IP ban check on all routes
app.use(checkIPBan);

// Global rate limiter
app.use(globalRateLimiter);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/client', clientAuthRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/admin', require('./routes/admin'));

// Error handling
app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', () => { console.log('Shutting down...'); process.exit(0); });
process.on('SIGINT',  () => { console.log('Shutting down...'); process.exit(0); });

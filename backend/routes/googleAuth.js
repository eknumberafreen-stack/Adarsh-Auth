/**
 * Google OAuth Routes
 */

const express  = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');

const router = express.Router();

// Safe logger helper for environment variables
const logOauthConfig = () => {
  const clientID = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || '';

  const redact = (str) => {
    if (!str) return '(not set)';
    if (str.length <= 10) return '***';
    return `${str.substring(0, 5)}...${str.substring(str.length - 5)}`;
  };

  console.log('[Google Auth] Initializing Google strategy with config:');
  console.log('  - Client ID:    ', redact(clientID));
  console.log('  - Client Secret:', redact(clientSecret));
  console.log('  - Callback URL: ', callbackURL || '(not set)');
};

logOauthConfig();

// ── Configure Passport Google Strategy ───────────────────────
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  proxy:        true,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(null, false);

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      try {
        // Use insertOne directly to bypass Mongoose schema index validation
        const result = await User.collection.insertOne({
          email,
          password: require('crypto').randomBytes(32).toString('hex'),
          googleId: profile.id,
          refreshToken: null,
          loginAttempts: 0,
          lockUntil: null,
          lastLogin: null,
          plan: null,
          planAssignedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        user = await User.findById(result.insertedId);
      } catch (createErr) {
        console.error('User Creation Error (Google):', createErr);
        if (createErr.code === 11000) {
          user = await User.findOne({ email });
          if (!user) return done(createErr, null);
        } else {
          return done(createErr, null);
        }
      }

      // Assign Free plan
      const freePlan = await SubscriptionPlan.findOne({ name: 'free' });
      if (freePlan && user) {
        await User.updateOne(
          { _id: user._id },
          { $set: { plan: freePlan._id, planAssignedAt: new Date() } }
        );
        user.plan = freePlan._id;
      }
    } else if (!user.googleId) {
      await User.updateOne(
        { _id: user._id },
        { $set: { googleId: profile.id } }
      );
      user.googleId = profile.id;
    }

    return done(null, user);
  } catch (err) {
    console.error('Google Strategy Error:', err);
    return done(err, null);
  }
}));

// ── Routes ────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://adarshauth.online'

// Step 1: Redirect to Google
router.get('/', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

// Step 2: Google callback (with custom callback for robust error handling)
router.get('/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err) {
      console.error('❌ [Google Callback Error] Authentication failed during token exchange:', err.message || err);
      if (err.stack) {
        console.error(err.stack);
      }
      const errorMsg = err.message || 'unknown_error';
      // Redirect back to login with a descriptive error query parameter
      return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed&details=${encodeURIComponent(errorMsg)}`);
    }

    if (!user) {
      console.warn('⚠️ [Google Callback Warning] No user was returned by Google strategy.');
      return res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
    }

    try {
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
      );

      res.redirect(
        `${FRONTEND_URL}/auth/google/success?accessToken=${accessToken}&refreshToken=${refreshToken}&userId=${user._id}&email=${encodeURIComponent(user.email)}`
      );
    } catch (tokenErr) {
      console.error('❌ [Google Callback JWT Error] Failed to sign tokens:', tokenErr);
      res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
    }
  })(req, res, next);
});

module.exports = router;

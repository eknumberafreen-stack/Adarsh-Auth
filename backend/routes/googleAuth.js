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

// Step 2: Google callback
router.get('/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=google_failed` }),
  async (req, res) => {
    try {
      const user = req.user;

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
    } catch (err) {
      console.error('Google Callback Error:', err);
      res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
    }
  }
);

module.exports = router;

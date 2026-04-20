/**
 * Google OAuth Routes
 */

const express  = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

const router = express.Router();

// ── Configure Passport Google Strategy ───────────────────────
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(null, false);

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        password: require('crypto').randomBytes(32).toString('hex'), // random password
        googleId: profile.id,
      });
    } else if (!user.googleId) {
      user.googleId = profile.id;
      await user.save();
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// ── Routes ────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

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
      res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
    }
  }
);

module.exports = router;

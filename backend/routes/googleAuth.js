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

// Clean and sanitize copy-pasted environment variables (removes quotes, whitespaces, and newlines)
const cleanEnvVar = (str) => {
  if (!str) return '';
  let cleaned = str.trim();
  // Strip enclosing double or single quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  return cleaned.trim();
};

const googleClientID = cleanEnvVar(process.env.GOOGLE_CLIENT_ID);
const googleClientSecret = cleanEnvVar(process.env.GOOGLE_CLIENT_SECRET);
const googleCallbackURL = cleanEnvVar(process.env.GOOGLE_CALLBACK_URL);

// Safe logger helper for environment variables
const logOauthConfig = () => {
  const redact = (str) => {
    if (!str) return '(not set)';
    if (str.length <= 10) return '***';
    return `${str.substring(0, 5)}...${str.substring(str.length - 5)}`;
  };

  console.log('[Google Auth] Initializing Google strategy with CLEANED config:');
  console.log('  - Client ID:    ', redact(googleClientID), `(len: ${googleClientID.length}, raw len: ${(process.env.GOOGLE_CLIENT_ID || '').length})`);
  console.log('  - Client Secret:', redact(googleClientSecret), `(len: ${googleClientSecret.length}, raw len: ${(process.env.GOOGLE_CLIENT_SECRET || '').length})`);
  console.log('  - Callback URL: ', googleCallbackURL || '(not set)', `(len: ${googleCallbackURL.length}, raw len: ${(process.env.GOOGLE_CALLBACK_URL || '').length})`);
};

logOauthConfig();

// ── Configure Passport Google Strategy ───────────────────────
const googleStrategy = new GoogleStrategy({
  clientID:     googleClientID,
  clientSecret: googleClientSecret,
  callbackURL:  googleCallbackURL,
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
});

// Override getOAuthAccessToken for deep request/response diagnostics
const originalGetOAuthAccessToken = googleStrategy._oauth2.getOAuthAccessToken;
googleStrategy._oauth2.getOAuthAccessToken = function (code, params, callback) {
  console.log('[OAuth2 Diagnostic] Executing Token Exchange Request:');
  console.log('  - code (auth code):  ', code);
  console.log('  - params (payload):  ', JSON.stringify(params));
  console.log('  - client_id:         ', this._clientId);
  console.log('  - client_secret:     ', this._clientSecret ? `${this._clientSecret.substring(0, 5)}...` : '(not set)');
  console.log('  - baseSite URL:      ', this._baseSite);
  console.log('  - accessTokenUrl:    ', this._accessTokenUrl);

  originalGetOAuthAccessToken.call(this, code, params, function (err, accessToken, refreshToken, results) {
    if (err) {
      console.error('[OAuth2 Diagnostic] Token Exchange API Call FAILED:');
      console.error('  - Error Message:     ', err.message || err);
      console.error('  - Error StatusCode:  ', err.statusCode);
      console.error('  - Error Raw Data:    ', err.data);
    } else {
      console.log('[OAuth2 Diagnostic] Token Exchange API Call SUCCESS:');
      console.log('  - Results:           ', JSON.stringify(results));
    }
    callback(err, accessToken, refreshToken, results);
  });
};

passport.use(googleStrategy);

// ── Routes ────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://adarshauth.online'

// Step 1: Redirect to Google
router.get('/', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

// Step 2: Google callback (with custom callback for robust error handling)
router.get('/callback', async (req, res, next) => {
  const code = req.query.code;
  
  console.log('[Google Callback Debug] Incoming Callback Request:');
  console.log('  - req.url:           ', req.url);
  console.log('  - req.originalUrl:   ', req.originalUrl);
  console.log('  - X-Forwarded-Proto: ', req.headers['x-forwarded-proto']);
  console.log('  - X-Forwarded-Host:  ', req.headers['x-forwarded-host']);
  console.log('  - Code present:      ', !!code);
  if (code) {
    console.log('  - Code length:       ', code.length);
    console.log('  - Code start/end:    ', `${code.substring(0, 10)}...${code.substring(code.length - 10)}`);
    console.log('  - Code has spaces:   ', /\s/.test(code));
    console.log('  - Code has newlines: ', /[\r\n]/.test(code));
  }

  if (!code) {
    console.warn('⚠️ [Google Callback] No code parameter present in callback request.');
    return res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
  }

  try {
    const { getRedisClient } = require('../config/redis');
    const redis = getRedisClient();
    const codeKey = `oauth:code:${code}`;

    // 1. Check if this authorization code has already been successfully exchanged
    const cachedResult = await redis.get(codeKey);
    if (cachedResult) {
      console.log('🔄 [Google Callback] Duplicate request detected. Serving cached session tokens from Redis.');
      const data = JSON.parse(cachedResult);
      return res.redirect(
        `${FRONTEND_URL}/auth/google/success?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}&userId=${data.userId}&email=${encodeURIComponent(data.email)}`
      );
    }
  } catch (redisErr) {
    // Fail open if Redis is down/disconnected during lookup
    console.error('⚠️ [Google Callback] Redis lookup failed, continuing with regular passport exchange:', redisErr.message);
  }

  // 2. Perform the regular passport authenticate if not cached
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

      // Cache the result in Redis for 30 seconds to block duplicate requests from breaking the login flow
      try {
        const { getRedisClient } = require('../config/redis');
        const redis = getRedisClient();
        const codeKey = `oauth:code:${code}`;
        await redis.setEx(codeKey, 30, JSON.stringify({
          accessToken,
          refreshToken,
          userId: user._id,
          email: user.email
        }));
      } catch (cacheErr) {
        console.error('⚠️ [Google Callback] Failed to cache tokens in Redis:', cacheErr.message);
      }

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

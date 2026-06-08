const https = require('https');
const querystring = require('querystring');

/**
 * Verify Cloudflare Turnstile token
 * @param {string} token The client token
 * @param {string} ip The client IP address
 * @returns {Promise<boolean>}
 */
function verifyTurnstileToken(token, ip) {
  return new Promise((resolve) => {
    // Fallback to Cloudflare's always-pass secret key if not configured in .env
    const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x000000000000000000000000000000000';

    const postData = querystring.stringify({
      secret: secretKey,
      response: token,
      remoteip: ip
    });

    const options = {
      hostname: 'challenges.cloudflare.com',
      port: 443,
      path: '/turnstile/v0/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(!!parsed.success);
        } catch (e) {
          console.error('[Turnstile] Failed to parse verification response:', e);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Turnstile] Verification request error:', err);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

module.exports = { verifyTurnstileToken };

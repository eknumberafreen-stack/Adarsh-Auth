/**
 * Discord Webhook Utility
 * Sends real-time notifications to Discord on auth events
 */

const https = require('https');
const { URL } = require('url');

/**
 * Send a Discord embed message to a webhook URL
 */
const sendDiscordWebhook = async (webhookUrl, embed) => {
  if (!webhookUrl) return;
  const cleanUrl = String(webhookUrl).trim();
  if (!cleanUrl.includes('/api/webhooks/')) return;

  let body = {};
  if (embed && Array.isArray(embed.embeds)) {
    body = embed;
  } else if (embed && typeof embed === 'object') {
    body = { embeds: [embed] };
  } else {
    return;
  }

  const payload = JSON.stringify(body);

  try {
    const url = new URL(cleanUrl);
    await new Promise((resolve) => {
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'User-Agent': 'AdarshAuth-Webhook/1.0'
        },
      }, (res) => {
        let respData = '';
        res.on('data', (chunk) => { respData += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 400) {
            console.error(`[Discord Webhook] HTTP ${res.statusCode}:`, respData);
          }
          resolve();
        });
      });
      req.on('error', (err) => {
        console.error('[Discord Webhook] Request error:', err.message);
        resolve(); // Never crash calling process
      });
      req.write(payload);
      req.end();
    });
  } catch (err) {
    console.error('[Discord Webhook] Exception:', err.message);
  }
};

const formatExpiry = (expiry) => {
  if (!expiry) return '`Lifetime`';
  const d = new Date(expiry);
  const pad = (n) => n.toString().padStart(2, '0');
  
  // Convert to IST (+5:30)
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const nd = new Date(utc + (3600000 * 5.5));
  
  let h = nd.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const hoursStr = h.toString().padStart(2, '0');
  
  return `\`${pad(nd.getDate())}-${pad(nd.getMonth()+1)}-${nd.getFullYear()}, ${hoursStr}:${pad(nd.getMinutes())} ${ampm} IST\``;
};

// ── Event Embeds ──────────────────────────────────────────────

const maskHwid = (hwid, fallback = 'N/A') => {
  if (!hwid) return fallback;
  const str = String(hwid);
  if (str.length <= 16) {
    if (str.length <= 6) return '******';
    const show = Math.floor(str.length / 3);
    return `${str.slice(0, show)}******${str.slice(-show)}`;
  }
  return `${str.slice(0, 12)}******${str.slice(-12)}`;
};

const loginEmbed = (username, ip, hwid, appName, expiry) => ({
  title: '✅ User Login',
  color: 0x57F287, // green
  fields: [
    { name: '👤 Username',    value: `\`${username}\``,  inline: true },
    { name: '🏠 App',         value: `\`${appName}\``,   inline: true },
    { name: '🌐 IP',          value: `\`${ip}\``,        inline: true },
    { name: '💻 HWID',        value: `\`${maskHwid(hwid)}\``, inline: false },
    { name: '📅 Expiry',      value: formatExpiry(expiry), inline: true },
  ],
  timestamp: new Date().toISOString(),
  footer: { text: 'AdarshAuth • Login Event' },
});

const registerEmbed = (username, ip, hwid, appName, licenseKey) => ({
  title: '🆕 New Registration',
  color: 0x5865F2, // blurple
  fields: [
    { name: '👤 Username',    value: `\`${username}\``,   inline: true },
    { name: '🏠 App',         value: `\`${appName}\``,    inline: true },
    { name: '🌐 IP',          value: `\`${ip}\``,         inline: true },
    { name: '💻 HWID',        value: `\`${maskHwid(hwid)}\``, inline: false },
    { name: '🔑 License',     value: `\`${licenseKey}\``, inline: true },
  ],
  timestamp: new Date().toISOString(),
  footer: { text: 'AdarshAuth • Register Event' },
});

const loginFailedEmbed = (username, ip, appName, reason) => ({
  title: '❌ Login Failed',
  color: 0xED4245, // red
  fields: [
    { name: '👤 Username',  value: `\`${username}\``, inline: true },
    { name: '🏠 App',       value: `\`${appName}\``,  inline: true },
    { name: '🌐 IP',        value: `\`${ip}\``,       inline: true },
    { name: '⚠️ Reason',    value: `\`${reason}\``,   inline: false },
  ],
  timestamp: new Date().toISOString(),
  footer: { text: 'AdarshAuth • Failed Login' },
});

const bannedEmbed = (username, ip, appName, reason) => ({
  title: '🔨 Banned User Attempt',
  color: 0xFEE75C, // yellow
  fields: [
    { name: '👤 Username',  value: `\`${username}\``, inline: true },
    { name: '🏠 App',       value: `\`${appName}\``,  inline: true },
    { name: '🌐 IP',        value: `\`${ip}\``,       inline: true },
    { name: '📝 Reason',    value: `\`${reason || 'Banned'}\``, inline: false },
  ],
  timestamp: new Date().toISOString(),
  footer: { text: 'AdarshAuth • Ban Event' },
});

const hwidMismatchEmbed = (username, ip, appName) => ({
  title: '⚠️ HWID Mismatch',
  color: 0xFEE75C, // yellow
  fields: [
    { name: '👤 Username',  value: `\`${username}\``, inline: true },
    { name: '🏠 App',       value: `\`${appName}\``,  inline: true },
    { name: '🌐 IP',        value: `\`${ip}\``,       inline: true },
  ],
  timestamp: new Date().toISOString(),
  footer: { text: 'AdarshAuth • HWID Mismatch' },
});

const integrityFailureEmbed = (username, ip, appName, expected, received) => ({
  title: '🚨 CRITICAL: Client Integrity Failure',
  description: 'A modified or unauthorized EXE was detected attempting to connect.',
  color: 0xED4245, // red
  fields: [
    { name: '👤 Username',  value: `\`${username || 'Unknown'}\``, inline: true },
    { name: '🏠 App',       value: `\`${appName}\``,  inline: true },
    { name: '🌐 IP',        value: `\`${ip}\``,       inline: true },
    { name: '📥 Received Hash', value: `\`${received}\``, inline: false },
    { name: '✅ Expected Hash', value: `\`${expected}\``, inline: false },
  ],
  timestamp: new Date().toISOString(),
  footer: { text: 'AdarshAuth • Anti-Tamper System' },
});

module.exports = {
  sendDiscordWebhook,
  maskHwid,
  loginEmbed,
  registerEmbed,
  loginFailedEmbed,
  bannedEmbed,
  hwidMismatchEmbed,
  integrityFailureEmbed,
};

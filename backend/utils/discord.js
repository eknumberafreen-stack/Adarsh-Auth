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
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) return;

  const payload = JSON.stringify({ embeds: [embed] });

  try {
    const url = new URL(webhookUrl);
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      }, (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  } catch (err) {
    console.error('[Discord Webhook] Failed:', err.message);
  }
};

// ── Event Embeds ──────────────────────────────────────────────

const loginEmbed = (username, ip, hwid, appName, expiry) => ({
  title: '✅ User Login',
  color: 0x57F287, // green
  fields: [
    { name: '👤 Username',    value: `\`${username}\``,  inline: true },
    { name: '🏠 App',         value: `\`${appName}\``,   inline: true },
    { name: '🌐 IP',          value: `\`${ip}\``,        inline: true },
    { name: '💻 HWID',        value: `\`${hwid || 'N/A'}\``, inline: false },
    { name: '📅 Expiry',      value: expiry ? `\`${new Date(expiry).toLocaleDateString()}\`` : '`Lifetime`', inline: true },
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
    { name: '💻 HWID',        value: `\`${hwid || 'N/A'}\``, inline: false },
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

module.exports = {
  sendDiscordWebhook,
  loginEmbed,
  registerEmbed,
  loginFailedEmbed,
  bannedEmbed,
  hwidMismatchEmbed,
};

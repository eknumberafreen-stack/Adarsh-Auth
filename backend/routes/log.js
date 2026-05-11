const express = require('express');
const router = express.Router();
const { sendDiscordWebhook } = require('../utils/discord');

/**
 * SECURE LOGGING ENDPOINT
 * Receives logs from the client and forwards to Discord.
 * Prevents the Discord Webhook from being leaked in the EXE.
 */
router.post('/', async (req, res) => {
    const { message, severity, hwid, username, details } = req.body;

    // Optional: Add basic auth or signature check here if you want to be extra safe
    
    const embed = {
        title: `Client Log - ${severity || 'INFO'}`,
        color: severity === 'CRITICAL' ? 0xFF0000 : 0x00FF00,
        fields: [
            { name: "User", value: username || "Unknown", inline: true },
            { name: "HWID", value: hwid || "Unknown", inline: true },
            { name: "Message", value: message || "No message" },
            { name: "Details", value: JSON.stringify(details) || "None" }
        ],
        timestamp: new Date()
    };

    // Forward to Discord (using your existing utility)
    // You can hardcode a specific 'Admin' webhook here
    const adminWebhook = process.env.ADMIN_LOG_WEBHOOK || req.body.webhook_url; 
    
    if (adminWebhook) {
        await sendDiscordWebhook(adminWebhook, { embeds: [embed] });
    }

    res.json({ success: true });
});

module.exports = router;

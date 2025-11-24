/**
 * june md Bot - Fake Auto-Typing System (Fixed Version)
 */

const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, "..", "data", "autotyping.json");

// Init config
function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// Universal message text extractor
function getText(msg) {
    return (
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        msg?.message?.imageMessage?.caption ||
        msg?.message?.videoMessage?.caption ||
        ""
    );
}

// Owner command
async function autotypingCommand(sock, chatId, message) {
    try {
        const { isSudo } = require("../lib/index");
        const sender = message.key.participant || message.key.remoteJid;

        const isOwner = message.key.fromMe || (await isSudo(sender));
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: "❌ Owner only!" }, { quoted: message });
            return;
        }

        let args = getText(message).trim().split(" ");
        args = args.slice(1);

        const config = initConfig();

        if (args.length > 0) {
            const a = args[0].toLowerCase();
            if (a === "on" || a === "enable") config.enabled = true;
            else if (a === "off" || a === "disable") config.enabled = false;
            else return sock.sendMessage(chatId, { text: "❌ Use: .autotyping on/off" }, { quoted: message });
        } else {
            config.enabled = !config.enabled;
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await sock.sendMessage(
            chatId,
            { text: `✅ Auto-typing ${config.enabled ? "enabled" : "disabled"}!` },
            { quoted: message }
        );
    } catch (e) {
        console.log("AUTO-TYPING ERROR:", e);
    }
}

function isAutotypingEnabled() {
    try {
        return initConfig().enabled;
    } catch {
        return false;
    }
}

// Auto typing handler (fixed)
async function handleAutotypingForMessage(sock, chatId, msgText) {
    if (!isAutotypingEnabled()) return false;

    try {
        await sock.presenceSubscribe(chatId);

        await sock.sendPresenceUpdate("available", chatId);
        await delay(300);

        await sock.sendPresenceUpdate("composing", chatId);

        const delayTime = Math.max(1200, Math.min(4000, msgText.length * 80));
        await delay(delayTime);

        await sock.sendPresenceUpdate("paused", chatId);

        return true;
    } catch (e) {
        console.log("Typing error:", e);
        return false;
    }
}

function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

module.exports = {
    autotypingCommand,
    isAutotypingEnabled,
    handleAutotypingForMessage
};

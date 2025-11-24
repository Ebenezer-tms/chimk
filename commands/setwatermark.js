const fs = require('fs');
const path = require('path');

// Path to bot settings file
const BOT_FILE = path.join(__dirname, '..', 'data', 'water.json');

// Default watermark caption
const DEFAULT_WATERMARK = "© Pretty-md is onn fire 🔥";

// Ensure bot.json exists
if (!fs.existsSync(BOT_FILE)) {
    fs.writeFileSync(BOT_FILE, JSON.stringify({ watermark: DEFAULT_WATERMARK }, null, 2));
}

/**
 * Get the watermark EXACTLY as saved
 */
function getWatermark() {
    try {
        const data = JSON.parse(fs.readFileSync(BOT_FILE, 'utf8'));
        return data.watermark || DEFAULT_WATERMARK;
    } catch (e) {
        return DEFAULT_WATERMARK;
    }
}

/**
 * Set watermark EXACTLY as typed
 */
function setWatermark(text) {
    try {
        const data = JSON.parse(fs.readFileSync(BOT_FILE, 'utf8'));
        data.watermark = text;
        fs.writeFileSync(BOT_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Reset watermark to default
 */
function resetWatermark() {
    try {
        const data = JSON.parse(fs.readFileSync(BOT_FILE, 'utf8'));
        data.watermark = DEFAULT_WATERMARK;
        fs.writeFileSync(BOT_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Extract RAW user text so uppercase is preserved
 */
function extractRaw(message) {
    try {
        if (message.message?.conversation) return message.message.conversation;
        if (message.message?.extendedTextMessage?.text) return message.message.extendedTextMessage.text;
        if (message.message?.imageMessage?.caption) return message.message.imageMessage.caption;
        if (message.message?.videoMessage?.caption) return message.message.videoMessage.caption;
        return "";
    } catch {
        return "";
    }
}

/**
 * Fake contact for quotes
 */
function fakeContact(message) {
    const number = message.key.participant?.split('@')[0]
        || message.key.remoteJid.split('@')[0];

    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "watermark"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD
VERSION:3.0
FN:Whatsapp Bot
TEL;waid=${number}:${number}
END:VCARD`
            }
        }
    };
}

/**
 * Handle setwatermark command
 */
async function handleSetWatermarkCommand(sock, chatId, message, prefix) {

    const RAW = extractRaw(message);
    const args = RAW.split(" ").slice(1);
    const newWM = args.join(" ");

    const fake = fakeContact(message);

    // only owner
    if (!message.key.fromMe) {
        await sock.sendMessage(chatId, { text: "❌ Only bot owner can change the bot caption!" }, { quoted: fake });
        return;
    }

    // show usage
    if (!newWM) {
        await sock.sendMessage(chatId, {
            text: `Use: ${prefix}setwatermark <caption>\nExample:\n${prefix}setwatermark © Pretty-MD Bot`
        }, { quoted: fake });
        return;
    }

    // reset
    if (newWM.toLowerCase() === "reset") {
        resetWatermark();
        await sock.sendMessage(chatId, { text: `🔄 Watermark reset to default: *${DEFAULT_WATERMARK}*` }, { quoted: fake });
        return;
    }

    // too long
    if (newWM.length > 60) {
        await sock.sendMessage(chatId, { text: "❌ Watermark must be under 60 characters!" }, { quoted: fake });
        return;
    }

    // save EXACT formatting
    const ok = setWatermark(newWM);

    await sock.sendMessage(chatId, {
        text: ok
            ? `✅ Watermark set to:\n*${newWM}*`
            : "❌ Failed to set watermark!"
    }, { quoted: fake });
}

module.exports = {
    getWatermark,
    setWatermark,
    resetWatermark,
    handleSetWatermarkCommand
};

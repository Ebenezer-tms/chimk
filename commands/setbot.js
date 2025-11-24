const fs = require('fs');
const path = require('path');

// Path to store bot settings
const BOT_FILE = path.join(__dirname, '..', 'data', 'bot.json');

// Default bot name
const DEFAULT_BOT_NAME = '😍PRETTY-MD😍';

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize bot file if missing
if (!fs.existsSync(BOT_FILE)) {
    fs.writeFileSync(BOT_FILE, JSON.stringify({ botName: DEFAULT_BOT_NAME }, null, 2));
}

/**
 * Get bot name EXACTLY as saved
 */
function getBotName() {
    try {
        const data = JSON.parse(fs.readFileSync(BOT_FILE, 'utf8'));
        return data.botName || DEFAULT_BOT_NAME;
    } catch (error) {
        console.error('Error reading bot file:', error);
        return DEFAULT_BOT_NAME;
    }
}

/**
 * Store bot name EXACTLY as the user typed
 */
function setBotName(newBotName) {
    try {
        if (!newBotName || newBotName.length > 20) return false;

        fs.writeFileSync(BOT_FILE, JSON.stringify({ botName: newBotName }, null, 2));
        return true;

    } catch (error) {
        console.error('Error saving bot name:', error);
        return false;
    }
}

/**
 * Reset bot name to default
 */
function resetBotName() {
    try {
        fs.writeFileSync(BOT_FILE, JSON.stringify({ botName: DEFAULT_BOT_NAME }, null, 2));
        return true;
    } catch (error) {
        console.error('Error resetting bot name:', error);
        return false;
    }
}

/**
 * Extract the RAW user message without lowercase
 */
function extractRawText(message) {
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

// Create a fake contact for WhatsApp quoting
function createFakeContact(message) {
    const number = message.key.participant?.split('@')[0]
        || message.key.remoteJid.split('@')[0];

    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "whatsapp"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD
VERSION:3.0
N:Sy;Bot;;;
FN:whatsapp
item1.TEL;waid=${number}:${number}
item1.X-ABLabel:Ponsel
END:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

/**
 * Handle the setbotname command
 */
async function handleSetBotCommand(sock, chatId, senderId, message, userMessage, prefix) {

    // 🔥 RAW MESSAGE (uppercase preserved even if handler lowercased)
    const RAW = extractRawText(message);

    // real arguments
    const args = RAW.split(" ").slice(1);
    const newBotName = args.join(" ");

    const fake = createFakeContact(message);

    // Only bot owner
    if (!message.key.fromMe) {
        await sock.sendMessage(chatId, {
            text: "❌ Only bot owner can change the bot name!"
        }, { quoted: fake });
        return;
    }

    // No new name
    if (!newBotName) {
        await sock.sendMessage(chatId, {
            text: `Use: ${prefix}setbotname <name>\nExample: ${prefix}setbotname Pretty MD`
        }, { quoted: fake });
        return;
    }

    // Reset (case-insensitive)
    if (newBotName.toLowerCase() === "reset") {
        resetBotName();
        await sock.sendMessage(chatId, {
            text: `🔄 Bot name reset to default: *${DEFAULT_BOT_NAME}*`
        }, { quoted: fake });
        return;
    }

    // Name too long
    if (newBotName.length > 20) {
        await sock.sendMessage(chatId, {
            text: "❌ Bot name must be 1–20 characters!"
        }, { quoted: fake });
        return;
    }

    // SAVE EXACT formatting
    const ok = setBotName(newBotName);

    await sock.sendMessage(chatId, {
        text: ok
            ? `✅ Bot name updated to: *${newBotName}*`
            : "❌ Failed to set bot name!"
    }, { quoted: fake });
}

module.exports = {
    getBotName,
    setBotName,
    resetBotName,
    handleSetBotCommand
};

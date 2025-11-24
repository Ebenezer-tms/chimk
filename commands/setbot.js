const fs = require('fs');
const path = require('path');

// Path to store owner settings
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
 * Get bot name (returns EXACT formatting saved)
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
 * Save bot name EXACTLY as user typed it
 */
function setBotName(newBotName) {
    try {
        if (!newBotName || newBotName.length > 500) return false;

        fs.writeFileSync(BOT_FILE, JSON.stringify({ botName: newBotName }, null, 2));
        return true;
    } catch (error) {
        console.error('Error setting bot name:', error);
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

// Fake contact for reply formatting
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

async function handleSetBotCommand(sock, chatId, senderId, message, userMessage, currentPrefix) {
    const args = userMessage.split(' ').slice(1);
    const newBotName = args.join(' ');

    const fake = createFakeContact(message);

    // Only bot owner can modify name
    if (!message.key.fromMe) {
        await sock.sendMessage(
            chatId,
            { text: '❌ Only bot owner can change the bot name!' },
            { quoted: fake }
        );
        return;
    }

    // Show usage if empty
    if (!newBotName) {
        await sock.sendMessage(
            chatId,
            {
                text: `Use: ${currentPrefix}setbotname <new name>\nExample: ${currentPrefix}setbotname Pretty MD`
            },
            { quoted: fake }
        );
        return;
    }

    // Reset bot name (case-insensitive)
    if (newBotName.toLowerCase() === 'reset') {
        const success = resetBotName();
        const defaultName = getBotName();
        await sock.sendMessage(
            chatId,
            {
                text: success
                    ? `✅ Bot name reset to default: *${defaultName}*`
                    : '❌ Failed to reset bot name!'
            },
            { quoted: fake }
        );
        return;
    }

    // Check name length
    if (newBotName.length > 20) {
        await sock.sendMessage(
            chatId,
            { text: '❌ Bot name must be between 1–20 characters!' },
            { quoted: fake }
        );
        return;
    }

    // Save EXACT name user typed
    const success = setBotName(newBotName);

    await sock.sendMessage(
        chatId,
        {
            text: success
                ? `✅ Bot name successfully set to: *${newBotName}*`
                : '❌ Failed to set bot name!'
        },
        { quoted: fake }
    );
}

module.exports = {
    getBotName,
    setBotName,
    resetBotName,
    handleSetBotCommand
};

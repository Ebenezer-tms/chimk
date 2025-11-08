const fs = require('fs');
const path = require('path');

// Path to store owner settings
const BOT_FILE = path.join(__dirname, '..', 'data', 'bot.json');

// Default owner name
const DEFAULT_BOT_NAME = '😍PRETTY-MD😍';

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize owner file if it doesn't exist
if (!fs.existsSync(BOT_FILE)) {
    fs.writeFileSync(BOT_FILE, JSON.stringify({ botName: DEFAULT_BOT_NAME }, null, 2));
}


/**
 * Get the current owner name
 * @returns {string} The current owner name
 */
function getBotName() {
    try {
        const data = JSON.parse(fs.readFileSync(BOT_FILE, 'utf8'));
        return data.botName || DEFAULT_BOT_NAME;
    } catch (error) {
        console.error('Error reading owner file:', error);
        return DEFAULT_BOT_NAME;
    }
}

/**
 * Set new owner name
 * @param {string} newOwnerName - The new owner name to set
 * @returns {boolean} Success status
 */
function setBotName(newBotName) {
    try {
        // Validate owner name
        if (!newBotName || newBotName.length > 500) {
            return false;
        }
        
        const data = { botName: newBotName };
        fs.writeFileSync(BOT_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error setting bot name:', error);
        return false;
    }
}

/**
 * Reset owner name to default
 * @returns {boolean} Success status
 */
function resetBotName() {
    try {
        const data = { botName: DEFAULT_BOT_NAME };
        fs.writeFileSync(BOT_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error resetting bot name:', error);
        return false;
    }
}

async function handleSetBotCommand(sock, chatId, senderId, message, userMessage, currentPrefix) {
    const args = userMessage.split(' ').slice(1);
   const newBotName = args.join(' ');
    
    // Create fake contact for enhanced replies
function createFakeContact(message) {
    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "whatsapp"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:whatsapp\nitem1.TEL;waid=${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}:${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}
    
  const fake = createFakeContact(message);
    // Only bot owner can change owner name
    if (!message.key.fromMe) {
        await sock.sendMessage(chatId, { 
            text: '❌ Only bot owner can change the owner name!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });
        return;
    }

    if (!newBotName) {
        // Show current owner name
        const current = getBotName();
        await sock.sendMessage(chatId, { 
            text: `Use: ${currentPrefix}setbotname ..... \nExample: ${currentPrefix}setbot pretty md`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });
        return;
    }

    if (newBotName.toLowerCase() === 'reset') {
        // Reset to default owner name
        const success = resetBotName();
        if (success) {
            const defaultBotName = getBotName();
            await sock.sendMessage(chatId, { 
                text: `✅ Bot name reset to default: *${defaultBotName}*`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            }, { quoted: fake });
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to reset bot name!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            },{ quoted: fake});
        }
        return;
    }

    // Set new bot name
    if (newBotName.length > 20) {
        await sock.sendMessage(chatId, { 
            text: '❌ Bot name must be 1-20 characters long!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });
        return;
    }

    const success = setBotName(newBotName);
    if (success) {
        await sock.sendMessage(chatId, { 
            text: `✅ Bot name successfully set to: *${newBotName}*`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,               forwardedNewsletterMessageInfo: {
                    newsletterJid: '@',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });
    } else {
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to set bot name!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,             forwardedNewsletterMessageInfo: {
                    newsletterJid: '@',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });
    }
}

module.exports = {
    getBotName,
    setBotName,
    resetBotName,
    handleSetBotCommand
};

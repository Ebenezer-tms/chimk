const fs = require('fs');
const path = require('path');

// Path to store prefix settings
const PREFIX_FILE = path.join(__dirname, '..', 'data', 'prefix.json');

// Default prefix
const DEFAULT_PREFIX = '.';

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize prefix file if it doesn't exist
if (!fs.existsSync(PREFIX_FILE)) {
    fs.writeFileSync(PREFIX_FILE, JSON.stringify({ prefix: DEFAULT_PREFIX }, null, 2));
}

/**
 * Get the current prefix
 * @returns {string} The current prefix
 */
function getPrefix() {
    try {
        const data = JSON.parse(fs.readFileSync(PREFIX_FILE, 'utf8'));
        return data.prefix || DEFAULT_PREFIX;
    } catch (error) {
        console.error('Error reading prefix file:', error);
        return DEFAULT_PREFIX;
    }
}

/**
 * Set new prefix
 * @param {string} newPrefix - The new prefix to set
 * @returns {boolean} Success status
 */
function setPrefix(newPrefix) {
    try {
        // Validate prefix
        if (!newPrefix || newPrefix.length > 3) {
            return false;
        }
        
        const data = { prefix: newPrefix };
        fs.writeFileSync(PREFIX_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error setting prefix:', error);
        return false;
    }
}

/**
 * Reset prefix to default
 * @returns {boolean} Success status
 */
function resetPrefix() {
    try {
        const data = { prefix: DEFAULT_PREFIX };
        fs.writeFileSync(PREFIX_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error resetting prefix:', error);
        return false;
    }
}


async function handleSetPrefixCommand(sock, chatId, senderId, message, userMessage, currentPrefix) {
    const args = userMessage.split(' ').slice(1);
    const newPrefix = args[0];
    
    // Only bot owner can change prefix
    if (!message.key.fromMe) {
        await sock.sendMessage(chatId, { 
            text: '❌ Only bot owner can change the prefix!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        },{quoted: message});
        return;
    }

    if (!newPrefix) {
        // Show current prefix
        const current = getPrefix();
        await sock.sendMessage(chatId, { 
            text: `🎯 Current prefix: *${current}*\n\nUsage: ${current}setprefix <new_prefix>\nExample: ${current}setprefix !`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        },{quoted: message});
        return;
    }

    if (newPrefix === 'reset') {
        // Reset to default prefix
        const success = resetPrefix();
        if (success) {
            const defaultPrefix = getPrefix();
            await sock.sendMessage(chatId, { 
                text: `✅ Prefix reset to default: *${defaultPrefix}*`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            },{quoted: message});
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to reset prefix!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            });
        }
        return;
    }

    // Set new prefix
    if (newPrefix.length > 3) {
        await sock.sendMessage(chatId, { 
            text: '❌ Prefix must be 1-3 characters long!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        },{quoted: message});
        return;
    }

    const success = setPrefix(newPrefix);
    if (success) {
        await sock.sendMessage(chatId, { 
            text: `✅ Prefix successfully set to new prefix: *${newPrefix}*`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        },{quoted: message});
    } else {
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to set prefix!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        },{quoted: message});
    }
}

module.exports = {
    getPrefix,
    setPrefix,
    resetPrefix,
    handleSetPrefixCommand
};

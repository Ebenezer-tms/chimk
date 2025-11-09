const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const STATUS_INBOX_DIR = path.join(__dirname, '../status_inbox');

// Ensure directory exists
if (!fs.existsSync(STATUS_INBOX_DIR)) {
    fs.mkdirSync(STATUS_INBOX_DIR, { recursive: true });
}

// Save status data
function saveStatusInfo(statusData) {
    try {
        const inboxFile = path.join(STATUS_INBOX_DIR, 'status_inbox.json');
        let existingData = [];
        
        if (fs.existsSync(inboxFile)) {
            existingData = JSON.parse(fs.readFileSync(inboxFile));
        }
        
        // Add new status to beginning of array
        existingData.unshift(statusData);
        
        // Keep only last 50 statuses to avoid too many files
        if (existingData.length > 50) {
            existingData = existingData.slice(0, 50);
        }
        
        fs.writeFileSync(inboxFile, JSON.stringify(existingData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving status info:', error);
        return false;
    }
}

// Handle status reaction
async function handleStatusReaction(sock, reaction) {
    try {
        // Check if it's a status reaction
        if (reaction.key?.remoteJid === 'status@broadcast' && reaction.message?.reactionMessage) {
            const reactionMsg = reaction.message.reactionMessage;
            const statusId = reactionMsg.key?.id;
            const emoji = reactionMsg.text || '❤️';
            const user = reaction.pushName || 'Unknown User';
            
            if (!statusId) return;

            console.log(`📱 Status reaction detected: ${emoji} from ${user}`);

            // Create status info
            const statusInfo = {
                id: statusId,
                emoji: emoji,
                user: user,
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleString(),
                type: 'status_reaction'
            };

            // Save to inbox
            saveStatusInfo(statusInfo);

            // Send confirmation to owner
            const ownerJid = sock.user?.id.split(':')[0] + '@s.whatsapp.net';
            
            try {
                await sock.sendMessage(ownerJid, {
                    text: `📱 *Status Saved to Inbox!*\n\n👤 *From:* ${user}\n${emoji} *Reaction:* ${emoji}\n⏰ *Time:* ${new Date().toLocaleString()}\n🆔 *Status ID:* ${statusId}\n\n*Status has been automatically saved to your inbox!*`
                });
            } catch (notifyError) {
                console.log('Notification sent to owner');
            }

        }
    } catch (error) {
        console.error('Error handling status reaction:', error);
    }
}

// Status inbox command
async function statusInboxCommand(sock, chatId, message, args) {
    try {
        const inboxFile = path.join(STATUS_INBOX_DIR, 'status_inbox.json');
        
        if (!fs.existsSync(inboxFile)) {
            return sock.sendMessage(chatId, {
                text: '📭 *Status Inbox Empty*\n\nNo status reactions have been saved yet. React to statuses with emojis to save them!',
                quoted: message
            });
        }

        const statusData = JSON.parse(fs.readFileSync(inboxFile));
        
        if (statusData.length === 0) {
            return sock.sendMessage(chatId, {
                text: '📭 *Status Inbox Empty*\n\nNo status reactions have been saved yet. React to statuses with emojis to save them!',
                quoted: message
            });
        }

        if (args[0] === 'clear') {
            fs.writeFileSync(inboxFile, JSON.stringify([]));
            return sock.sendMessage(chatId, {
                text: '🗑️ *Status Inbox Cleared!*\n\nAll saved status reactions have been removed.',
                quoted: message
            });
        }

        // Show status list
        let statusList = `📱 *STATUS INBOX (${statusData.length})*\n\n`;
        
        statusData.slice(0, 15).forEach((status, index) => {
            statusList += `*${index + 1}.* ${status.emoji} | ${status.date}\n`;
            statusList += `   👤 *From:* ${status.user}\n`;
            statusList += `   🆔 *ID:* ${status.id}\n\n`;
        });

        if (statusData.length > 15) {
            statusList += `\n... and ${statusData.length - 15} more status reactions.\n`;
        }

        statusList += `\n*Usage:*\n• .statusinbox - View saved statuses\n• .statusinbox clear - Clear all saved statuses`;

        return sock.sendMessage(chatId, {
            text: statusList,
            quoted: message
        });

    } catch (error) {
        console.error('Error in status inbox command:', error);
        return sock.sendMessage(chatId, {
            text: '❌ Error accessing status inbox. Please try again.',
            quoted: message
        });
    }
}

module.exports = {
    handleStatusReaction,
    statusInboxCommand
};

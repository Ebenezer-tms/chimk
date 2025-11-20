const sessionManager = require('../sessionManager');

async function connectCommand(sock, chatId, senderId, message, userMessage, prefix) {
    const args = userMessage.split(' ').slice(1);
    const input = args.join(' ');

    if (!input) {
        return await sock.sendMessage(chatId, {
            text: `🤖 *Bot Hosting System*\n\n` +
                  `*Usage:*\n` +
                  `• ${prefix}connect <your_session_string> - Host a new bot\n` +
                  `• ${prefix}connect list - List your hosted bots\n` +
                  `• ${prefix}connect disconnect <session_id> - Stop hosting a bot\n` +
                  `• ${prefix}connect info - Show your hosting info\n\n` +
                  `💡 *Your session string should start with XHYPHER:~*`
        }, { quoted: message });
    }

    try {
        if (input.toLowerCase() === 'list') {
            const userBots = sessionManager.listUserBots(senderId);
            
            if (userBots.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '📭 You are not hosting any bots'
                }, { quoted: message });
                return;
            }

            let botList = `🤖 *Your Hosted Bots* (${userBots.length}/10)\n\n`;
            userBots.forEach((sessionId, index) => {
                const status = sessionManager.getBotStatus(sessionId);
                const timeAgo = getTimeAgo(status?.connectedAt || Date.now());
                const statusEmoji = status?.isActive ? '🟢' : '🔴';
                
                botList += `${index + 1}. ${statusEmoji} *${sessionId}*\n`;
                botList += `   ⏰ Created: ${timeAgo}\n`;
                botList += `   📊 Status: ${status?.isActive ? 'Active' : 'Connecting...'}\n\n`;
            });

            await sock.sendMessage(chatId, {
                text: botList
            }, { quoted: message });

        } else if (input.toLowerCase().startsWith('disconnect')) {
            const sessionId = input.split(' ')[1];
            if (!sessionId) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Usage: ${prefix}connect disconnect <session_id>`
                }, { quoted: message });
            }

            const result = sessionManager.disconnectBot(senderId, sessionId);
            await sock.sendMessage(chatId, {
                text: result.message
            }, { quoted: message });

        } else if (input.toLowerCase() === 'info') {
            const botCount = sessionManager.getUserBotCount(senderId);
            const userBots = sessionManager.listUserBots(senderId);
            let activeBots = 0;

            userBots.forEach(sessionId => {
                const status = sessionManager.getBotStatus(sessionId);
                if (status?.isActive) activeBots++;
            });

            await sock.sendMessage(chatId, {
                text: `📊 *Your Hosting Information*\n\n` +
                      `🤖 *Total Bots:* ${botCount}/10\n` +
                      `🟢 *Active Bots:* ${activeBots}\n` +
                      `🟡 *Connecting Bots:* ${botCount - activeBots}\n` +
                      `👤 *Your ID:* ${formatJid(senderId)}\n\n` +
                      `Use ${prefix}connect list to see all your bots`
            }, { quoted: message });

        } else {
            // This is a session string - host a new bot
            if (!input.startsWith('XHYPHER:~')) {
                return await sock.sendMessage(chatId, {
                    text: '❌ Session must start with XHYPHER:~'
                }, { quoted: message });
            }

            // Check if it's a valid session string (basic length check)
            if (input.length < 100) {
                return await sock.sendMessage(chatId, {
                    text: '❌ Invalid session string. Please provide the complete session string.'
                }, { quoted: message });
            }

            await sock.sendMessage(chatId, {
                text: '🔄 Initializing your bot session...'
            }, { quoted: message });

            const result = await sessionManager.connectToSession(input, senderId);
            await sock.sendMessage(chatId, {
                text: result.message
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in connect command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while processing your request: ' + error.message
        }, { quoted: message });
    }
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

function formatJid(jid) {
    return jid.split('@')[0] + '***';
}

module.exports = connectCommand;

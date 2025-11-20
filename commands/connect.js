const sessionManager = require('../sessionManager');

async function connectCommand(sock, chatId, senderId, message, userMessage, prefix) {
    const args = userMessage.split(' ').slice(1);
    const sessionId = args[0];

    if (!sessionId) {
        return await sock.sendMessage(chatId, {
            text: `🔗 *Bot Connection System*\n\n` +
                  `*Usage:*\n` +
                  `• ${prefix}connect <session_id> - Connect to a bot session\n` +
                  `• ${prefix}connect list - List your connected sessions\n` +
                  `• ${prefix}connect disconnect - Disconnect from current session\n` +
                  `• ${prefix}connect info - Show your connection info\n\n` +
                  `📝 *Note:* Session ID must start with XHYPHER:~`
        }, { quoted: message });
    }

    try {
        if (sessionId.toLowerCase() === 'list') {
            const userBots = sessionManager.listUserBots(senderId);
            
            if (userBots.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '📭 You are not connected to any sessions'
                }, { quoted: message });
                return;
            }

            let botList = `🤖 *Your Connected Sessions* (${userBots.length}/10)\n\n`;
            userBots.forEach((sessionId, index) => {
                const status = sessionManager.getBotStatus(sessionId);
                const timeAgo = getTimeAgo(status?.connectedAt || Date.now());
                const statusEmoji = status?.isActive ? '🟢' : '🔴';
                
                botList += `${index + 1}. ${statusEmoji} *${sessionId}*\n`;
                botList += `   ⏰ Connected: ${timeAgo}\n`;
                botList += `   📊 Status: ${status?.isActive ? 'Active' : 'Inactive'}\n\n`;
            });

            await sock.sendMessage(chatId, {
                text: botList
            }, { quoted: message });

        } else if (sessionId.toLowerCase() === 'disconnect') {
            const result = sessionManager.disconnectBot(senderId);
            await sock.sendMessage(chatId, {
                text: result.message
            }, { quoted: message });

        } else if (sessionId.toLowerCase() === 'info') {
            const botCount = sessionManager.getUserBotCount(senderId);
            const userBots = sessionManager.listUserBots(senderId);
            let activeBots = 0;

            userBots.forEach(sessionId => {
                const status = sessionManager.getBotStatus(sessionId);
                if (status?.isActive) activeBots++;
            });

            await sock.sendMessage(chatId, {
                text: `📊 *Your Connection Information*\n\n` +
                      `🤖 *Connected Bots:* ${botCount}/10\n` +
                      `🟢 *Active Bots:* ${activeBots}\n` +
                      `🔴 *Inactive Bots:* ${botCount - activeBots}\n` +
                      `👤 *Your ID:* ${formatJid(senderId)}\n\n` +
                      `Use ${prefix}connect list to see all your connections`
            }, { quoted: message });

        } else {
            // Connect to session
            if (!sessionId.startsWith('XHYPHER:~')) {
                return await sock.sendMessage(chatId, {
                    text: '❌ Session ID must start with XHYPHER:~'
                }, { quoted: message });
            }

            const result = await sessionManager.connectToSession(sessionId, senderId);
            await sock.sendMessage(chatId, {
                text: result.message
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in connect command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while processing your request'
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

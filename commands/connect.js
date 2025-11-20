const sessionManager = require('../sessionManager');

async function connectCommand(sock, chatId, senderId, message, userMessage, prefix) {
    const args = userMessage.split(' ').slice(1);
    const action = args[0]?.toLowerCase();

    if (!action) {
        return await sock.sendMessage(chatId, {
            text: `🤖 *Multi-Bot Hosting System*\n\n` +
                  `*Usage:*\n` +
                  `• ${prefix}connect create <session_id> <session_string> - Host a new bot\n` +
                  `• ${prefix}connect disconnect <session_id> - Stop hosting a bot\n` +
                  `• ${prefix}connect list - List your hosted bots\n` +
                  `• ${prefix}connect status <session_id> - Check bot status\n` +
                  `• ${prefix}connect info - Show your hosting info\n\n` +
                  `📝 *Note:* Session ID must start with XHYPHER:~`
        }, { quoted: message });
    }

    try {
        if (action === 'create') {
            const sessionId = args[1];
            const sessionString = args.slice(2).join(' ');

            if (!sessionId || !sessionString) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Usage: ${prefix}connect create <session_id> <session_string>\n\n` +
                          `Example: ${prefix}connect create XHYPHER:~ABC123 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
                }, { quoted: message });
            }

            const result = await sessionManager.createHostedBot(sessionId, senderId, sessionString);
            await sock.sendMessage(chatId, {
                text: result.message
            }, { quoted: message });

        } else if (action === 'disconnect') {
            const sessionId = args[1];
            if (!sessionId) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Usage: ${prefix}connect disconnect <session_id>`
                }, { quoted: message });
            }

            const result = sessionManager.disconnectBot(sessionId, senderId);
            await sock.sendMessage(chatId, {
                text: result.message
            }, { quoted: message });

        } else if (action === 'list') {
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
                botList += `   ⏰ Connected: ${timeAgo}\n`;
                botList += `   📊 Status: ${status?.isActive ? 'Active' : 'Inactive'}\n\n`;
            });

            await sock.sendMessage(chatId, {
                text: botList
            }, { quoted: message });

        } else if (action === 'status') {
            const sessionId = args[1];
            if (!sessionId) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Usage: ${prefix}connect status <session_id>`
                }, { quoted: message });
            }

            const status = sessionManager.getBotStatus(sessionId);
            if (!status) {
                await sock.sendMessage(chatId, {
                    text: '❌ Bot session not found'
                }, { quoted: message });
                return;
            }

            const uptime = formatUptime(status.uptime);
            await sock.sendMessage(chatId, {
                text: `📊 *Bot Status*\n\n` +
                      `🔑 *Session ID:* ${status.sessionId}\n` +
                      `🔄 *Status:* ${status.isActive ? '🟢 Active' : '🔴 Inactive'}\n` +
                      `⏰ *Uptime:* ${uptime}\n` +
                      `👤 *Owner:* ${formatJid(status.owner)}`
            }, { quoted: message });

        } else if (action === 'info') {
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
                      `🔴 *Inactive Bots:* ${botCount - activeBots}\n` +
                      `👤 *Your ID:* ${formatJid(senderId)}\n\n` +
                      `Use ${prefix}connect list to see all your bots`
            }, { quoted: message });

        } else {
            await sock.sendMessage(chatId, {
                text: '❌ Invalid action. Use `.connect` to see available commands.'
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

function formatUptime(ms) {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function formatJid(jid) {
    return jid.split('@')[0] + '***';
}

module.exports = connectCommand;

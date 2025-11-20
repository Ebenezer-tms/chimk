const sessionManager = require('../sessionManager');

async function connectCommand(sock, chatId, senderId, message, userMessage, prefix) {
    const args = userMessage.split(' ').slice(1);
    const action = args[0]?.toLowerCase();

    if (!action) {
        return await sock.sendMessage(chatId, {
            text: `🔗 *Session Connection System*\n\n` +
                  `*Usage:*\n` +
                  `• ${prefix}connect create - Create a new session\n` +
                  `• ${prefix}connect <session_id> - Connect to a session\n` +
                  `• ${prefix}connect disconnect - Disconnect from current session\n` +
                  `• ${prefix}connect list - List your connected sessions\n` +
                  `• ${prefix}connect info - Show your current session info`
        }, { quoted: message });
    }

    try {
        if (action === 'create') {
            const sessionId = generateSessionId();
            const result = sessionManager.createSession(sessionId, senderId);
            
            await sock.sendMessage(chatId, {
                text: result.message + `\n\n📋 *Session ID:* ${sessionId}\n` +
                      `🔗 Share this ID with others to let them connect to your session`
            }, { quoted: message });

        } else if (action === 'disconnect') {
            const result = sessionManager.disconnectSession(senderId);
            await sock.sendMessage(chatId, {
                text: result.message
            }, { quoted: message });

        } else if (action === 'list') {
            const sessions = sessionManager.listConnectedSessions(senderId);
            
            if (sessions.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '📭 You are not connected to any sessions'
                }, { quoted: message });
                return;
            }

            let sessionList = `📋 *Your Connected Sessions* (${sessions.length}/10)\n\n`;
            sessions.forEach((session, index) => {
                const timeAgo = getTimeAgo(session.connectedAt);
                sessionList += `${index + 1}. *${session.sessionId}*\n   ⏰ Connected: ${timeAgo}\n\n`;
            });

            await sock.sendMessage(chatId, {
                text: sessionList
            }, { quoted: message });

        } else if (action === 'info') {
            const currentSession = sessionManager.getSessionByUser(senderId);
            
            if (!currentSession) {
                await sock.sendMessage(chatId, {
                    text: '❌ You are not connected to any session'
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(chatId, {
                text: `📊 *Session Information*\n\n` +
                      `🔑 *Session ID:* ${currentSession}\n` +
                      `👤 *Your ID:* ${senderId}\n` +
                      `🔄 Use ${prefix}connect list to see all your sessions`
            }, { quoted: message });

        } else {
            // Try to connect to the provided session ID
            const sessionId = action;
            const result = sessionManager.connectToSession(sessionId, senderId);
            
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

function generateSessionId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
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

module.exports = connectCommand;

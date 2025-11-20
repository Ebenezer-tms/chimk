const sessionManager = require('../sessionManager');

async function listConnectedCommand(sock, chatId, senderId, message, prefix) {
    try {
        const allConnections = sessionManager.listAllConnected();
        
        if (allConnections.length === 0) {
            await sock.sendMessage(chatId, {
                text: '📭 No active sessions found'
            }, { quoted: message });
            return;
        }

        // Group by session ID
        const sessions = {};
        allConnections.forEach(conn => {
            if (!sessions[conn.sessionId]) {
                sessions[conn.sessionId] = [];
            }
            sessions[conn.sessionId].push(conn);
        });

        let connectionList = `🔗 *All Connected Sessions*\n\n`;
        let totalUsers = 0;

        Object.entries(sessions).forEach(([sessionId, connections], index) => {
            const owner = connections.find(conn => conn.userJid === getSessionOwner(sessionId));
            const ownerInfo = owner ? `👑 ${formatJid(owner.userJid)}` : '👑 Unknown Owner';
            
            connectionList += `*Session ${index + 1}:* ${sessionId}\n`;
            connectionList += `   ${ownerInfo}\n`;
            connectionList += `   👥 Connected Users: ${connections.length}\n`;
            
            connections.forEach(conn => {
                if (conn.userJid !== owner?.userJid) {
                    connectionList += `   👤 ${formatJid(conn.userJid)}\n`;
                }
            });
            
            connectionList += `   ⏰ Active for: ${getTimeAgo(connections[0].connectedAt)}\n\n`;
            totalUsers += connections.length;
        });

        connectionList += `📊 *Total:* ${Object.keys(sessions).length} sessions, ${totalUsers} users connected`;

        await sock.sendMessage(chatId, {
            text: connectionList
        }, { quoted: message });

    } catch (error) {
        console.error('Error in listconnected command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while fetching connected sessions'
        }, { quoted: message });
    }
}

function getSessionOwner(sessionId) {
    // This would need to be implemented based on how you track session ownership
    // For now, we'll use the first user who connected to this session
    const allConnections = sessionManager.listAllConnected();
    const sessionConnections = allConnections.filter(conn => conn.sessionId === sessionId);
    return sessionConnections[0]?.userJid;
}

function formatJid(jid) {
    return jid.split('@')[0] + '***';
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
}

module.exports = listConnectedCommand;

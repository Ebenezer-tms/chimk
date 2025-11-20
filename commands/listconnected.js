const sessionManager = require('../sessionManager');

async function listConnectedCommand(sock, chatId, senderId, message, prefix) {
    try {
        const allBots = sessionManager.listAllBots();
        
        if (allBots.length === 0) {
            await sock.sendMessage(chatId, {
                text: '📭 No active bot sessions found'
            }, { quoted: message });
            return;
        }

        let botList = `🤖 *All Active Bot Sessions*\n\n`;
        let activeCount = 0;

        allBots.forEach((bot, index) => {
            const statusEmoji = bot.isActive ? '🟢' : '🔴';
            const uptime = bot.isActive ? formatUptime(Date.now() - bot.connectedAt) : 'Offline';
            
            botList += `*${index + 1}.* ${statusEmoji} *${bot.sessionId}*\n`;
            botList += `   👥 Users: ${bot.userCount}\n`;
            botList += `   ⏰ Uptime: ${uptime}\n`;
            botList += `   📊 Status: ${bot.isActive ? 'Active' : 'Inactive'}\n\n`;
            
            if (bot.isActive) activeCount++;
        });

        botList += `📊 *Summary:* ${allBots.length} total sessions, ${activeCount} active, ${allBots.length - activeCount} inactive`;

        await sock.sendMessage(chatId, {
            text: botList
        }, { quoted: message });

    } catch (error) {
        console.error('Error in listconnected command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while fetching bot sessions'
        }, { quoted: message });
    }
}

function formatUptime(ms) {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

module.exports = listConnectedCommand;

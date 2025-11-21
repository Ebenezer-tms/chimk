const sessionManager = require('../sessionManager');

async function listConnectedCommand(sock, chatId, senderId, message, prefix) {
    try {
        const allDeployments = sessionManager.listAllDeployments();
        
        if (allDeployments.length === 0) {
            await sock.sendMessage(chatId, {
                text: '📭 No active bot deployments found'
            }, { quoted: message });
            return;
        }

        let deploymentList = `🚀 *All Bot Deployments* (${allDeployments.length})\n\n`;
        let activeCount = 0;

        allDeployments.forEach((deployment, index) => {
            const statusEmoji = deployment.isActive ? '🟢' : '🔴';
            const uptime = deployment.isActive ? formatUptime(Date.now() - deployment.deployedAt) : 'Offline';
            
            deploymentList += `*${index + 1}.* ${statusEmoji} ${formatJid(deployment.userJid)}\n`;
            deploymentList += `   🔑 Deployment: ${deployment.deploymentId}\n`;
            deploymentList += `   👤 Name: ${deployment.userInfo.pushName || 'Unknown'}\n`;
            deploymentList += `   ⏰ Uptime: ${uptime}\n\n`;
            
            if (deployment.isActive) activeCount++;
        });

        deploymentList += `📊 *Summary:* ${allDeployments.length} total deployments, ${activeCount} active`;

        await sock.sendMessage(chatId, {
            text: deploymentList
        }, { quoted: message });

    } catch (error) {
        console.error('Error in listconnected command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while fetching deployments'
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

function formatJid(jid) {
    return jid.split('@')[0] + '***';
}

module.exports = listConnectedCommand;

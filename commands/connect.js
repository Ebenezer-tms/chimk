const sessionManager = require('../sessionManager');

async function connectCommand(sock, chatId, senderId, message, rawMessage, prefix) {
    const input = rawMessage.slice(prefix.length + 'connect'.length).trim();

    if (!input) {
        return await sock.sendMessage(chatId, {
            text: `🚀 *Bot Deployment System*\n\n` +
                  `*Deploy this bot to your WhatsApp account:*\n\n` +
                  `*Usage:*\n` +
                  `• ${prefix}connect <your_session_id> - Deploy bot\n` +
                  `• ${prefix}connect list - Your deployments\n` +
                  `• ${prefix}connect stop <id> - Stop deployment\n` +
                  `• ${prefix}connect status <id> - Check status\n` +
                  `• ${prefix}connect info - Your info\n\n` +
                  `💡 *Get your session ID from:*\n` +
                  `• Your existing bot session\n` +
                  `• WhatsApp Web session data\n` +
                  `• Session export from another bot`
        }, { quoted: message });
    }

    try {
        if (input.toLowerCase() === 'list') {
            const userDeployments = sessionManager.listUserDeployments(senderId);
            
            if (userDeployments.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '📭 You have no active deployments\n\nUse `.connect <session_id>` to deploy a bot'
                }, { quoted: message });
                return;
            }

            let deploymentList = `🚀 *Your Bot Deployments* (${userDeployments.length}/10)\n\n`;
            userDeployments.forEach((deploymentId, index) => {
                const status = sessionManager.getDeploymentStatus(deploymentId);
                const timeAgo = getTimeAgo(status?.deployedAt || Date.now());
                const statusEmoji = status?.isActive ? '🟢' : '🔴';
                const attempts = status?.connectionAttempts || 0;
                
                deploymentList += `${index + 1}. ${statusEmoji} *${deploymentId}*\n`;
                deploymentList += `   ⏰ Deployed: ${timeAgo}\n`;
                deploymentList += `   📊 Status: ${status?.isActive ? 'Active' : 'Connecting...'}\n`;
                if (attempts > 0) {
                    deploymentList += `   🔄 Attempts: ${attempts}\n`;
                }
                deploymentList += `\n`;
            });

            await sock.sendMessage(chatId, {
                text: deploymentList
            }, { quoted: message });

        } else if (input.toLowerCase().startsWith('stop')) {
            const deploymentId = input.split(' ')[1];
            if (!deploymentId) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Usage: ${prefix}connect stop <deployment_id>\n\nUse \`${prefix}connect list\` to see your deployments`
                }, { quoted: message });
            }

            const result = sessionManager.stopDeployment(deploymentId, senderId);
            await sock.sendMessage(chatId, {
                text: result.message
            }, { quoted: message });

        } else if (input.toLowerCase().startsWith('status')) {
            const deploymentId = input.split(' ')[1];
            if (!deploymentId) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Usage: ${prefix}connect status <deployment_id>`
                }, { quoted: message });
            }

            const status = sessionManager.getDeploymentStatus(deploymentId);
            if (!status) {
                await sock.sendMessage(chatId, {
                    text: '❌ Deployment not found'
                }, { quoted: message });
                return;
            }

            const uptime = status.isActive ? formatUptime(status.uptime) : 'Not connected';
            await sock.sendMessage(chatId, {
                text: `📊 *Deployment Status*\n\n` +
                      `🔑 *ID:* ${status.deploymentId}\n` +
                      `🔄 *Status:* ${status.isActive ? '🟢 Active' : '🔴 Connecting'}\n` +
                      `⏰ *Uptime:* ${uptime}\n` +
                      `🔢 *Attempts:* ${status.connectionAttempts || 0}\n` +
                      `👤 *Owner:* ${formatJid(status.userJid)}`
            }, { quoted: message });

        } else if (input.toLowerCase() === 'info') {
            const deploymentCount = sessionManager.getUserDeploymentCount(senderId);
            const userDeployments = sessionManager.listUserDeployments(senderId);
            let activeDeployments = 0;

            userDeployments.forEach(deploymentId => {
                const status = sessionManager.getDeploymentStatus(deploymentId);
                if (status?.isActive) activeDeployments++;
            });

            await sock.sendMessage(chatId, {
                text: `📊 *Deployment Information*\n\n` +
                      `🚀 *Total:* ${deploymentCount}/10 deployments\n` +
                      `🟢 *Active:* ${activeDeployments} bots\n` +
                      `🔴 *Connecting:* ${deploymentCount - activeDeployments}\n` +
                      `👤 *Your ID:* ${formatJid(senderId)}\n\n` +
                      `Use \`${prefix}connect list\` to see deployments`
            }, { quoted: message });

        } else {
            // This is a session string - deploy the bot
            if (!input.startsWith('XHYPHER:~')) {
                await sock.sendMessage(chatId, {
                    text: '❌ Session must start with XHYPHER:~'
                }, { quoted: message });
                return;
            }

            // Check if session string is too short
            if (input.length < 100) {
                await sock.sendMessage(chatId, {
                    text: '❌ Session ID seems too short. Please check your session ID.'
                }, { quoted: message });
                return;
            }

            // Get user info
            const userInfo = {
                pushName: message.pushName || 'Unknown',
                deployTime: new Date().toLocaleString(),
                originalJid: senderId
            };

            await sock.sendMessage(chatId, {
                text: '🚀 Starting bot deployment...\n⏰ This may take up to 30 seconds'
            }, { quoted: message });

            const result = await sessionManager.deployBot(input, senderId, userInfo);
            await sock.sendMessage(chatId, {
                text: result.message
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in connect command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Deployment error: ' + error.message
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

const { getConfig } = require('../lib/configdb');

async function listonlineCommand(sock, chatId, message) {
    try {
        // Check if it's a group
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command can only be used in groups.',
                ...global.channelInfo
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            text: '⏳ Fetching online members...',
            ...global.channelInfo
        }, { quoted: message });

        // Get group metadata
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;

        // Arrays to store online/offline members
        const onlineMembers = [];
        const offlineMembers = [];
        const unknownStatus = [];

        // Get current time
        const currentTime = Math.floor(Date.now() / 1000);

        // Get bot's presence status
        const botPresence = await sock.fetchStatus(sock.user.id.split(':')[0] + '@s.whatsapp.net').catch(() => null);

        // Online status thresholds (in seconds)
        const ONLINE_THRESHOLD = 60; // 1 minute
        const RECENT_THRESHOLD = 300; // 5 minutes

        // Get user presence for each participant
        for (const participant of participants) {
            try {
                // Skip bots
                if (participant.id.includes('@s.whatsapp.net')) {
                    // Get user's presence status
                    const presence = await sock.presenceGet(chatId, participant.id).catch(() => null);
                    
                    // Get user's last seen
                    const lastSeen = await sock.fetchStatus(participant.id).catch(() => null);
                    
                    // Parse last seen timestamp
                    let isOnline = false;
                    let status = '❓ Unknown';
                    
                    if (presence) {
                        // Check presence status
                        switch(presence) {
                            case 'available':
                                isOnline = true;
                                status = '🟢 Online';
                                break;
                            case 'unavailable':
                                status = '⚪️ Offline';
                                break;
                            case 'composing':
                                isOnline = true;
                                status = '✍️ Typing...';
                                break;
                            case 'recording':
                                isOnline = true;
                                status = '🎤 Recording...';
                                break;
                            default:
                                status = `⚪️ ${presence}`;
                        }
                    }
                    
                    // If we have last seen time, use that as fallback
                    if (!presence && lastSeen) {
                        const lastSeenTime = lastSeen.lastSeen ? parseInt(lastSeen.lastSeen) : null;
                        if (lastSeenTime) {
                            const timeDiff = currentTime - lastSeenTime;
                            
                            if (timeDiff < ONLINE_THRESHOLD) {
                                isOnline = true;
                                status = `🟢 Online (${timeDiff}s ago)`;
                            } else if (timeDiff < RECENT_THRESHOLD) {
                                status = `🟡 Recently (${Math.floor(timeDiff/60)}m ago)`;
                            } else {
                                const hours = Math.floor(timeDiff / 3600);
                                const minutes = Math.floor((timeDiff % 3600) / 60);
                                
                                if (hours > 0) {
                                    status = `⚪️ Offline (${hours}h ${minutes}m ago)`;
                                } else {
                                    status = `⚪️ Offline (${minutes}m ago)`;
                                }
                            }
                        }
                    }
                    
                    // Format user info
                    const userPushName = participant.notify || participant.id.split('@')[0];
                    const userInfo = `• @${participant.id.split('@')[0]} (${userPushName}) - ${status}`;
                    
                    // Categorize
                    if (isOnline) {
                        onlineMembers.push({
                            jid: participant.id,
                            info: userInfo,
                            status: status
                        });
                    } else if (status.includes('Offline') || status.includes('offline')) {
                        offlineMembers.push({
                            jid: participant.id,
                            info: userInfo,
                            status: status
                        });
                    } else {
                        unknownStatus.push({
                            jid: participant.id,
                            info: userInfo,
                            status: status
                        });
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.error(`Error checking status for ${participant.id}:`, error.message);
            }
        }

        // Prepare message
        let messageText = `📊 *Group Online Status*\n`;
        messageText += `👥 Total Members: ${participants.length}\n`;
        messageText += `🟢 Online: ${onlineMembers.length}\n`;
        messageText += `⚪️ Offline: ${offlineMembers.length}\n`;
        messageText += `❓ Unknown: ${unknownStatus.length}\n\n`;
        
        // Add online members
        if (onlineMembers.length > 0) {
            messageText += `*🟢 ONLINE MEMBERS (${onlineMembers.length})*\n`;
            onlineMembers.forEach(member => {
                messageText += `${member.info}\n`;
            });
            messageText += '\n';
        }
        
        // Add recently online members (within 5 minutes)
        const recentMembers = unknownStatus.filter(m => 
            m.status.includes('Recently') || 
            m.status.includes('recently') ||
            (m.status.includes('ago') && parseInt(m.status.match(/\d+/)?.[0] || 0) < 10)
        );
        
        if (recentMembers.length > 0) {
            messageText += `*🟡 RECENTLY ONLINE (${recentMembers.length})*\n`;
            recentMembers.forEach(member => {
                messageText += `${member.info}\n`;
            });
            messageText += '\n';
        }
        
        // Add offline members (if less than 20)
        if (offlineMembers.length > 0 && offlineMembers.length <= 20) {
            messageText += `*⚪️ OFFLINE MEMBERS (${offlineMembers.length})*\n`;
            offlineMembers.slice(0, 10).forEach(member => {
                messageText += `${member.info}\n`;
            });
            if (offlineMembers.length > 10) {
                messageText += `... and ${offlineMembers.length - 10} more\n`;
            }
            messageText += '\n';
        } else if (offlineMembers.length > 20) {
            messageText += `*⚪️ OFFLINE MEMBERS: ${offlineMembers.length}*\n`;
        }
        
        // Add footer
        messageText += `\n⏰ Last updated: ${new Date().toLocaleTimeString()}`;
        messageText += `\n📌 *Note:* Status is approximate and based on last seen time.`;
        
        // Prepare mentions
        const mentions = [
            ...onlineMembers.map(m => m.jid),
            ...recentMembers.map(m => m.jid)
        ];

        await sock.sendMessage(chatId, {
            text: messageText,
            mentions: mentions
        }, { quoted: message });

    } catch (error) {
        console.error('Error in listonline command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to fetch online members. Make sure the bot has admin permissions and try again.',
            ...global.channelInfo
        }, { quoted: message });
    }
}

module.exports = listonlineCommand;

async function onlineCommand(sock, chatId, message) {
    try {
        // Check if it's a group
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command can only be used in groups.'
            }, { quoted: message });
        }

        // Initial response
        await sock.sendMessage(chatId, {
            text: '📡 Scanning for online members...'
        }, { quoted: message });

        // Get group metadata
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;
        
        const onlineMembers = [];
        const lastSeenCache = new Map();

        // Method 1: Try to use presence detection
        try {
            // Request presence updates for all participants
            const presencePromises = participants.map(async (participant) => {
                try {
                    // Subscribe to presence
                    await sock.presenceSubscribe(chatId, participant.id);
                    
                    // Wait a bit for presence update
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Get presence
                    const presence = await sock.presenceGet(chatId, participant.id);
                    
                    if (presence && (presence === 'available' || presence === 'composing' || presence === 'recording')) {
                        return participant.id;
                    }
                } catch (e) {
                    // Fallback to last seen
                    try {
                        const status = await sock.fetchStatus(participant.id);
                        if (status && status.lastSeen) {
                            const lastSeenTime = parseInt(status.lastSeen);
                            const currentTime = Math.floor(Date.now() / 1000);
                            
                            // If last seen within last 2 minutes, consider online
                            if ((currentTime - lastSeenTime) < 120) {
                                return participant.id;
                            }
                        }
                    } catch (e2) {
                        // Skip if both methods fail
                    }
                }
                return null;
            });

            // Wait for all presence checks
            const results = await Promise.allSettled(presencePromises);
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    onlineMembers.push(result.value);
                }
            });

        } catch (error) {
            console.error('Presence check error:', error);
            
            // Fallback: Check if users are active on WhatsApp at all
            for (const participant of participants) {
                try {
                    const isOnWhatsApp = await sock.isOnWhatsApp(participant.id);
                    if (isOnWhatsApp) {
                        onlineMembers.push(participant.id);
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        // Remove duplicates
        const uniqueOnlineMembers = [...new Set(onlineMembers)];

        // Prepare message
        let messageText = `👥 *Total Members:* ${participants.length}\n`;
        messageText += `🟢 *Online Now:* ${uniqueOnlineMembers.length}\n\n`;
        
        if (uniqueOnlineMembers.length > 0) {
            messageText += '*🟢 Online Members:*\n';
            uniqueOnlineMembers.forEach((jid, index) => {
                const username = jid.split('@')[0];
                messageText += `${index + 1}. @${username}\n`;
            });
        } else {
            messageText += '*No members detected as online right now.*\n';
            messageText += '_Note: Some users may have privacy settings that hide their online status._';
        }

        // Prepare mentions (only if we have online members)
        const mentions = uniqueOnlineMembers.map(jid => jid);

        // Send result
        await sock.sendMessage(chatId, {
            text: messageText,
            mentions: mentions.length > 0 ? mentions : undefined
        }, { quoted: message });

    } catch (error) {
        console.error('Error in online command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to check online status. The bot may need admin permissions.'
        }, { quoted: message });
    }
}

module.exports = onlineCommand;

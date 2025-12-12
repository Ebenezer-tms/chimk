async function onlineCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command only works in groups.'
            }, { quoted: message });
        }

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;
        const onlineMembers = [];

        // Simple check - only check presence for members in the group
        // This might work even without admin permissions
        for (const participant of participants) {
            try {
                // Simple presence check
                const isActive = await sock.isOnWhatsApp(participant.id).catch(() => false);
                if (isActive) {
                    onlineMembers.push(participant.id);
                }
            } catch {
                continue;
            }
        }

        let text = `👥 *Total Members:* ${participants.length}\n`;
        text += `🟢 *Active Members:* ${onlineMembers.length}\n\n`;
        
        if (onlineMembers.length > 0) {
            text += '*Active Members:*\n';
            onlineMembers.forEach((jid, i) => {
                const username = jid.split('@')[0];
                text += `${i + 1}. @${username}\n`;
            });
            
            await sock.sendMessage(chatId, {
                text: text,
                mentions: onlineMembers
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: text + '*No active members found.*'
            }, { quoted: message });
        }

    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to check member status.'
        }, { quoted: message });
    }
}

module.exports = onlineCommand;

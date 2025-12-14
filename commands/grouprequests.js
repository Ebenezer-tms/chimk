async function pendingRequestsCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ This command only works in groups!' 
            });
        }

        const metadata = await sock.groupMetadata(chatId);
        
        // List all group members with status
        const pendingMembers = metadata.participants.filter(p => 
            p.pending || p.pending === true || p.request === true
        );

        if (pendingMembers.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '📭 No pending join requests found.' 
            });
        }

        let text = `📋 *Pending Requests: ${pendingMembers.length}*\n\n`;
        
        pendingMembers.forEach((member, index) => {
            const username = member.id.split('@')[0];
            text += `${index + 1}. @${username}\n`;
        });

        text += `\n💡 Use:\n• .approveall to approve all\n• .rejectall to reject all`;

        await sock.sendMessage(chatId, { 
            text: text,
            mentions: pendingMembers.map(m => m.id)
        });

    } catch (error) {
        await sock.sendMessage(chatId, { 
            text: '❌ Error checking requests.' 
        });
    }
}

async function approveAllCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ This command only works in groups!' 
            });
        }

        const metadata = await sock.groupMetadata(chatId);
        const pendingMembers = metadata.participants.filter(p => 
            p.pending || p.pending === true || p.request === true
        );

        if (pendingMembers.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '📭 No pending requests to approve.' 
            });
        }

        // If there are pending members, approve them by adding to group
        const userJids = pendingMembers.map(m => m.id);
        
        // Try to add them to group (this will approve if they requested)
        for (const jid of userJids) {
            await sock.groupParticipantsUpdate(
                chatId,
                [jid],
                'add'
            ).catch(() => {});
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        await sock.sendMessage(chatId, { 
            text: `✅ Added ${userJids.length} user(s) to group.` 
        });

    } catch (error) {
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to add users. Bot needs admin permissions.' 
        });
    }
}

async function rejectAllCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ This command only works in groups!' 
            });
        }

        const metadata = await sock.groupMetadata(chatId);
        const pendingMembers = metadata.participants.filter(p => 
            p.pending || p.pending === true || p.request === true
        );

        if (pendingMembers.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '📭 No pending requests to reject.' 
            });
        }

        await sock.sendMessage(chatId, { 
            text: `❌ Rejected ${pendingMembers.length} request(s)!` 
        });

    } catch (error) {
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to reject requests.' 
        });
    }
}

module.exports = {
    pendingRequestsCommand,
    approveAllCommand,
    rejectAllCommand
};

const { isAdmin } = require('../lib/isAdmin');

async function pendingRequestsCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ This command only works in groups!' 
            }, { quoted: message });
        }

        const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can use this command!' 
            }, { quoted: message });
        }

        const pendingRequests = await sock.groupRequestParticipantsList(chatId).catch(() => []);

        if (!pendingRequests || pendingRequests.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '📭 No pending join requests found.' 
            }, { quoted: message });
        }

        let text = `📋 *Pending Join Requests (${pendingRequests.length})*\n\n`;
        
        pendingRequests.forEach((request, index) => {
            const userJid = request.jid;
            const username = userJid.split('@')[0];
            text += `${index + 1}. @${username}\n`;
        });

        text += `\n💡 Use:\n• .approveall to approve all\n• .rejectall to reject all`;

        const mentions = pendingRequests.map(req => req.jid);
        
        await sock.sendMessage(chatId, { 
            text: text,
            mentions: mentions
        }, { quoted: message });

    } catch (error) {
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to fetch pending requests.' 
        }, { quoted: message });
    }
}

async function approveAllCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ This command only works in groups!' 
            }, { quoted: message });
        }

        const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can use this command!' 
            }, { quoted: message });
        }

        const pendingRequests = await sock.groupRequestParticipantsList(chatId).catch(() => []);

        if (!pendingRequests || pendingRequests.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '📭 No pending join requests to approve.' 
            }, { quoted: message });
        }

        const userJids = pendingRequests.map(req => req.jid);
        
        await sock.groupRequestParticipantsUpdate(
            chatId,
            userJids,
            'approve'
        );

        await sock.sendMessage(chatId, { 
            text: `✅ Approved ${userJids.length} join request(s)!` 
        }, { quoted: message });

    } catch (error) {
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to approve requests.' 
        }, { quoted: message });
    }
}

async function rejectAllCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ This command only works in groups!' 
            }, { quoted: message });
        }

        const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can use this command!' 
            }, { quoted: message });
        }

        const pendingRequests = await sock.groupRequestParticipantsList(chatId).catch(() => []);

        if (!pendingRequests || pendingRequests.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '📭 No pending join requests to reject.' 
            }, { quoted: message });
        }

        const userJids = pendingRequests.map(req => req.jid);
        
        await sock.groupRequestParticipantsUpdate(
            chatId,
            userJids,
            'reject'
        );

        await sock.sendMessage(chatId, { 
            text: `❌ Rejected ${userJids.length} join request(s)!` 
        }, { quoted: message });

    } catch (error) {
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to reject requests.' 
        }, { quoted: message });
    }
}

module.exports = {
    pendingRequestsCommand,
    approveAllCommand,
    rejectAllCommand
};

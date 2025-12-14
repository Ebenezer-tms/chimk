const { isAdmin } = require('../lib/isAdmin');

let joinRequests = new Map();

async function pendingRequestsCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { text: '❌ Groups only!' });
        }

        const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            return await sock.sendMessage(chatId, { text: '❌ Admins only!' });
        }

        const requests = joinRequests.get(chatId) || [];
        
        if (requests.length === 0) {
            return await sock.sendMessage(chatId, { text: '📭 No pending requests.' });
        }

        let text = `📋 *Pending Requests: ${requests.length}*\n\n`;
        requests.forEach((req, index) => {
            text += `${index + 1}. @${req.split('@')[0]}\n`;
        });

        await sock.sendMessage(chatId, { 
            text: text,
            mentions: requests
        });

    } catch (error) {
        await sock.sendMessage(chatId, { text: '❌ Error' });
    }
}

async function approveAllCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { text: '❌ Groups only!' });
        }

        const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            return await sock.sendMessage(chatId, { text: '❌ Admins only!' });
        }

        const requests = joinRequests.get(chatId) || [];
        
        if (requests.length === 0) {
            return await sock.sendMessage(chatId, { text: '📭 No requests to approve.' });
        }

        for (const userJid of requests) {
            await sock.groupParticipantsUpdate(
                chatId,
                [userJid],
                'add'
            ).catch(() => {});
        }

        joinRequests.delete(chatId);

        await sock.sendMessage(chatId, { 
            text: `✅ Approved ${requests.length} request(s)!` 
        });

    } catch (error) {
        await sock.sendMessage(chatId, { text: '❌ Failed to approve' });
    }
}

async function rejectAllCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { text: '❌ Groups only!' });
        }

        const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            return await sock.sendMessage(chatId, { text: '❌ Admins only!' });
        }

        const requests = joinRequests.get(chatId) || [];
        
        if (requests.length === 0) {
            return await sock.sendMessage(chatId, { text: '📭 No requests to reject.' });
        }

        joinRequests.delete(chatId);

        await sock.sendMessage(chatId, { 
            text: `❌ Rejected ${requests.length} request(s)!` 
        });

    } catch (error) {
        await sock.sendMessage(chatId, { text: '❌ Failed to reject' });
    }
}

// To track join requests (you need to call this when someone tries to join)
function trackJoinRequest(chatId, userJid) {
    if (!joinRequests.has(chatId)) {
        joinRequests.set(chatId, []);
    }
    const requests = joinRequests.get(chatId);
    if (!requests.includes(userJid)) {
        requests.push(userJid);
    }
}

module.exports = {
    pendingRequestsCommand,
    approveAllCommand,
    rejectAllCommand,
    trackJoinRequest
};

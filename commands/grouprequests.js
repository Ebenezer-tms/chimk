// Store pending requests manually
const pendingRequests = new Map();

async function pendingRequestsCommand(sock, chatId, message) {
    const requests = pendingRequests.get(chatId) || [];
    
    if (requests.length === 0) {
        return await sock.sendMessage(chatId, { 
            text: '📭 No pending requests found.\n\nPeople who try to join will appear here.' 
        });
    }

    let text = `📋 *Pending Requests: ${requests.length}*\n\n`;
    
    requests.forEach((req, index) => {
        text += `${index + 1}. @${req.split('@')[0]}\n`;
    });

    text += `\n💡 Use:\n• .approveall to approve all\n• .rejectall to reject all`;

    await sock.sendMessage(chatId, { 
        text: text,
        mentions: requests
    });
}

async function approveAllCommand(sock, chatId, message) {
    const requests = pendingRequests.get(chatId) || [];
    
    if (requests.length === 0) {
        return await sock.sendMessage(chatId, { 
            text: '📭 No requests to approve.' 
        });
    }

    for (const userJid of requests) {
        try {
            await sock.groupParticipantsUpdate(
                chatId,
                [userJid],
                'add'
            );
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Failed to add ${userJid}:`, error.message);
        }
    }

    pendingRequests.delete(chatId);
    
    await sock.sendMessage(chatId, { 
        text: `✅ Approved ${requests.length} request(s)!` 
    });
}

async function rejectAllCommand(sock, chatId, message) {
    const requests = pendingRequests.get(chatId) || [];
    
    if (requests.length === 0) {
        return await sock.sendMessage(chatId, { 
            text: '📭 No requests to reject.' 
        });
    }

    pendingRequests.delete(chatId);
    
    await sock.sendMessage(chatId, { 
        text: `❌ Rejected ${requests.length} request(s)!` 
    });
}

// Function to add a request (call this when someone tries to join)
function addRequest(chatId, userJid) {
    if (!pendingRequests.has(chatId)) {
        pendingRequests.set(chatId, []);
    }
    const requests = pendingRequests.get(chatId);
    if (!requests.includes(userJid)) {
        requests.push(userJid);
    }
}

module.exports = {
    pendingRequestsCommand,
    approveAllCommand,
    rejectAllCommand,
    addRequest
};

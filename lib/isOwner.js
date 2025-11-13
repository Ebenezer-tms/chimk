const { isSudo } = require('./index');
const { getOwnerNumber, isOwner } = require('../commands/setownernumber');

/**
 * Check if user is owner or sudo
 * @param {string} senderId - The user ID to check
 * @param {object} sock - Socket instance (optional)
 * @param {string} chatId - Chat ID (optional)
 * @returns {boolean} Whether the user is owner or sudo
 */
async function isOwnerOrSudo(senderId, sock = null, chatId = null) {
    try {
        // Get dynamic owner number from the new system
        const ownerJid = getOwnerNumber();
        
        // Direct JID match with dynamic owner number
        if (senderId === ownerJid) {
            return true;
        }
        
        // Use the new isOwner function
        if (isOwner(senderId)) {
            return true;
        }
        
        // Extract sender's numeric parts for additional checks
        const senderIdClean = senderId.split(':')[0].split('@')[0];
        const ownerNumberClean = ownerJid.split('@')[0];
        
        // Check if sender's phone number matches owner number
        if (senderIdClean === ownerNumberClean) {
            return true;
        }
        
        // Extract LID numeric if present
        const senderLidNumeric = senderId.includes('@lid') ? senderId.split('@')[0].split(':')[0] : '';
        
        // In groups, check if sender's LID matches bot's LID (owner uses same account as bot)
        if (sock && chatId && chatId.endsWith('@g.us') && senderId.includes('@lid')) {
            try {
                // Get bot's LID numeric
                const botLid = sock.user?.lid || '';
                const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
                
                // Check if sender's LID numeric matches bot's LID numeric
                if (senderLidNumeric && botLidNumeric && senderLidNumeric === botLidNumeric) {
                    return true;
                }
                
                // Also check participant data for additional matching
                const metadata = await sock.groupMetadata(chatId);
                const participants = metadata.participants || [];
                
                const participant = participants.find(p => {
                    const pLid = p.lid || '';
                    const pLidNumeric = pLid.includes(':') ? pLid.split(':')[0] : (pLid.includes('@') ? pLid.split('@')[0] : pLid);
                    const pId = p.id || '';
                    const pIdClean = pId.split(':')[0].split('@')[0];
                    
                    return (
                        p.lid === senderId || 
                        p.id === senderId ||
                        pLidNumeric === senderLidNumeric ||
                        pIdClean === senderIdClean ||
                        pIdClean === ownerNumberClean
                    );
                });
                
                if (participant) {
                    const participantId = participant.id || '';
                    const participantLid = participant.lid || '';
                    const participantIdClean = participantId.split(':')[0].split('@')[0];
                    const participantLidNumeric = participantLid.includes(':') ? participantLid.split(':')[0] : (participantLid.includes('@') ? participantLid.split('@')[0] : participantLid);
                    
                    if (participantId === ownerJid || 
                        participantIdClean === ownerNumberClean ||
                        participantLidNumeric === botLidNumeric) {
                        return true;
                    }
                }
            } catch (e) {
                console.error('❌ [isOwner] Error checking participant data:', e);
            }
        }
        
        // Check if sender ID contains owner number (fallback)
        if (senderId.includes(ownerNumberClean)) {
            return true;
        }
        
        // Check sudo status as final fallback
        try {
            return await isSudo(senderId);
        } catch (e) {
            console.error('❌ [isOwner] Error checking sudo:', e);
            return false;
        }
        
    } catch (error) {
        console.error('❌ [isOwner] Error in isOwnerOrSudo:', error);
        // Fallback: check sudo status only
        try {
            return await isSudo(senderId);
        } catch (e) {
            return false;
        }
    }
}

/**
 * Simple owner check without group metadata
 * @param {string} senderId - The user ID to check
 * @returns {boolean} Whether the user is owner
 */
function isOwnerSimple(senderId) {
    try {
        const ownerJid = getOwnerNumber();
        const ownerNumberClean = ownerJid.split('@')[0];
        const senderIdClean = senderId.split(':')[0].split('@')[0];
        
        return senderId === ownerJid || 
               senderIdClean === ownerNumberClean || 
               senderId.includes(ownerNumberClean) ||
               isOwner(senderId); // Use the new isOwner function
    } catch (error) {
        console.error('❌ [isOwner] Error in isOwnerSimple:', error);
        return false;
    }
}

/**
 * Check if message is from owner (for message handlers)
 * @param {object} message - The message object
 * @returns {boolean} Whether the message is from owner
 */
function isMessageFromOwner(message) {
    try {
        if (!message?.key) return false;
        
        const senderId = message.key.participant || message.key.remoteJid;
        return isOwnerSimple(senderId) || message.key.fromMe;
    } catch (error) {
        console.error('❌ [isOwner] Error in isMessageFromOwner:', error);
        return false;
    }
}

module.exports = {
    isOwnerOrSudo,
    isOwnerSimple,
    isMessageFromOwner
};

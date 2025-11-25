const { getOwnerNumber } = require('../commands/setownernumber');
const { isSudo } = require('./index');

async function isOwnerOrSudo(senderId, sock = null, chatId = null) {

    // Get owner number ALWAYS in jid format
    const ownerJid = getOwnerNumber();  
    const ownerNumberClean = ownerJid.split('@')[0];

    // Direct match
    if (senderId === ownerJid) return true;

    // Check raw number match
    const senderClean = senderId.split('@')[0].split(':')[0];
    if (senderClean === ownerNumberClean) return true;

    // Group special check for @lid users
    if (sock && chatId && chatId.endsWith('@g.us')) {
        try {
            const botLid = sock.user?.lid || '';
            const botLidClean = botLid.split(':')[0];

            // sender LID numeric
            const senderLid = senderId.includes('@lid')
                ? senderId.split('@')[0].split(':')[0]
                : '';

            if (senderLid && botLidClean && senderLid === botLidClean)
                return true;

            // Check participants
            const metadata = await sock.groupMetadata(chatId);
            const participant = metadata.participants.find(p => {
                const pid = p.id || '';
                const plid = p.lid || '';

                const pidClean = pid.split('@')[0].split(':')[0];
                const plidClean = plid.split('@')[0].split(':')[0];

                return (
                    pid === ownerJid ||
                    pidClean === ownerNumberClean ||
                    plidClean === botLidClean
                );
            });

            if (participant) return true;

        } catch (err) {
            console.error("❌ isOwner error:", err);
        }
    }

    // Fallback
    if (senderId.includes(ownerNumberClean)) return true;

    // Allow sudo
    try {
        return await isSudo(senderId);
    } catch {
        return false;
    }
}

module.exports = isOwnerOrSudo;

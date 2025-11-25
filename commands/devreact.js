async function handleDevReact(sock, message) {
    const senderId = message.key.participant || message.key.remoteJid;
    if (senderId.includes('263715305976')) {
        try {
            await sock.sendMessage(message.key.remoteJid, {
                react: { text: '👑', key: message.key }
            });
        } catch (err) {
            // Ignore errors
        }
    }
}

module.exports = { handleDevReact };

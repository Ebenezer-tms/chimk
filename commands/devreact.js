// Fixed dev react to 263715305976 with 👑 (cannot be turned off)
async function handleDevReact(sock, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        if (senderId.includes('263715305976')) {
            await sock.sendMessage(message.key.remoteJid, {
                react: { text: '👑', key: message.key }
            });
        }
    } catch (error) {
        // Silent fail - don't show any errors
    }
}

module.exports = {
    handleDevReact
};

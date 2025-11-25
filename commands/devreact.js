async function handleDevReact(sock, message) {
    try {
        if (!message || !message.key) return;

        // Only react to real messages (not status, not system events)
        if (!message.message) return;

        // Get sender number (works for private and group)
        const rawSender = message.key.participant || message.key.remoteJid;
        const sender = rawSender.split('@')[0];

        const OWNER = "263715305976"; // <-- your number only

        console.log(`🔍 Checking sender: ${sender}`);

        if (sender === OWNER) {
            console.log('✅ Owner detected! Sending 👑 reaction...');

            await sock.sendMessage(message.key.remoteJid, {
                react: {
                    text: '👑',
                    key: message.key
                }
            });

            console.log('✅ Reaction sent!');
        } else {
            console.log('❌ Not the owner:', sender);
        }

    } catch (error) {
        console.log('❌ Error in handleDevReact:', error);
    }
}

module.exports = { handleDevReact };

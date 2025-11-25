async function handleDevReact(sock, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        console.log('🔍 Checking sender:', senderId);
        
        if (senderId.includes('263715305976')) {
            console.log('✅ Found target number, sending 👑 reaction');
            await sock.sendMessage(message.key.remoteJid, {
                react: { text: '👑', key: message.key }
            });
            console.log('✅ Reaction sent successfully');
        } else {
            console.log('❌ Not target number:', senderId);
        }
    } catch (error) {
        console.log('❌ Error in handleDevReact:', error.message);
    }
}

module.exports = { handleDevReact };

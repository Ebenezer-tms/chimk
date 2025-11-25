async function handleDevReact(sock, msg) {
    try {
        if (!msg || !msg.key) return; 

        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith("@g.us");

        // FIX: Correct sender extraction for groups & private chats
        const sender = isGroup
            ? msg.key.participant           // sender inside group
            : remoteJid;                    // sender in private chat

        console.log("📌 Sender detected:", sender);

        // YOUR number (bare format inside strings)
        const OWNER = "263715305976";

        // Match owner in either format:
        // - "263715305976@s.whatsapp.net"
        // - "263715305976"
        const cleanSender = sender.replace("@s.whatsapp.net", "");

        if (cleanSender === OWNER) {
            console.log("👑 Owner detected — sending reaction...");

            await sock.sendMessage(remoteJid, {
                react: {
                    text: "👑",
                    key: msg.key
                }
            });

            console.log("✅ Reaction sent!");
        } else {
            console.log("❌ Not owner:", cleanSender);
        }

    } catch (err) {
        console.error("❌ Error in dev reaction:", err);
    }
}

module.exports = { handleDevReact };

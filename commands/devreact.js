async function handleDevReact(sock, msg) {
    try {
        if (!msg || !msg.key) return;

        // Only react to real messages
        if (!msg.message) return;

        // Extract correct sender number
        let sender = "";

        if (msg.key.participant) {
            // Group chat
            sender = msg.key.participant.split("@")[0];
        } else {
            // Private chat
            sender = msg.key.remoteJid.split("@")[0];
        }

        const OWNER = "263715305976";  // <-- your number exactly

        console.log("🔍 Message from:", sender);

        if (sender === OWNER) {
            console.log("👑 Owner detected, reacting...");

            await sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: "👑",
                    key: msg.key
                }
            });

            console.log("✅ Reaction sent!");
        }
    } catch (err) {
        console.log("❌ React Error:", err);
    }
}

module.exports = { handleDevReact };

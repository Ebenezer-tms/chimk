module.exports = async function uptimeCommand(sock, chatId, m, startTime) {
    try {
        const uptime = Math.floor((Date.now() - startTime) / 1000); // in seconds
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;

        const message = `*🤖 Bot Uptime:*\nhoursh{minutes}m ${seconds}s`;

        await sock.sendMessage(chatId, { text: message }, { quoted: m });
    } catch (err) {
        await sock.sendMessage(chatId, { text: '❌ Error fetching uptime.' }, { quoted: m });
    }
};

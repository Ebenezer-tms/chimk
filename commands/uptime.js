const settings = require("../settings");
const os = require("os");
const path = require("path");
const fs = require("fs");

// Uptime formatter
function runtime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

async function uptimeCommand(sock, chatId, message) {
    try {
        // ❤️ Reaction when command triggered
        await sock.sendMessage(chatId, {
            react: {
                text: "❤️",
                key: message.key
            }
        });

        const userName = message.pushName || "User";
        const botUptime = runtime(process.uptime());
        const totalMemory = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
        const usedMemory = (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2);
        const host = os.platform();

        const uptimeMessage =
            `👋 \`\`\` Hello ${userName}, I'm alive now \`\`\`\n\n` +
            `_*This ${settings.botName || "Knight Bot"} WhatsApp Bot is made for your easy use. This bot is currently active🪄*_\n\n` +
            `> *Version:* ${settings.version}\n` +
            `> *Memory:* ${usedMemory}MB / ${totalMemory}GB\n` +
            `> *Runtime:* ${botUptime}\n` +
            `> *Host:* ${host}\n\n` +
            `*${settings.botName || "Knight Bot"} Online*\n\n` +
            `*🧚Follow our channel:* https://whatsapp.com/channel/0029Va8YUl50bIdtVMYnYd0E\n\n` +
            `> ρσωєяє∂ ву ${settings.ownerName || "Héctor Manuel"}`;

        // Resolve the local image path
        const imagePath = path.resolve(__dirname, "../media/riam.jpg");

        // Send local image
        await sock.sendMessage(chatId, {
            image: fs.readFileSync(imagePath),
            caption: uptimeMessage
        }, { quoted: message });

    } catch (error) {
        console.error("Error in alive command:", error);

        // Send fallback text
        await sock.sendMessage(chatId, {
            text: `❌ An error occurred, but here's the info:\n\n${uptimeMessage}`
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: "⚠️", key: message.key }
        });
    }
}

module.exports = uptimeCommand;

async function gitcloneCommand(sock, chatId, message) {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
    const parts = text.split(' ');
    const query = parts.slice(1).join(' ').trim();

    if (!query) {
        await sock.sendMessage(chatId, {
            text: "*❌ Please provide a Git repository URL.*\n\n_Usage:_\n.gitclone https://github.com/user/repo.git"
        }, { quoted: message });
        return;
    }

    const { exec } = require("child_process");
    const path = require("path");
    const fs = require("fs");

    try {
        const repoUrl = query.trim();
        const repoNameMatch = repoUrl.match(/\/([^\/]+)\.git$/);
        
        if (!repoNameMatch) {
            await sock.sendMessage(chatId, {
                text: "❌ Invalid Git repository URL."
            }, { quoted: message });
            return;
        }

        const repoName = repoNameMatch[1];
        const targetPath = path.resolve(__dirname, "../repos", repoName);

        await sock.sendMessage(chatId, {
            text: `⏳ Cloning repository: ${repoUrl}`
        }, { quoted: message });

        if (!fs.existsSync(path.dirname(targetPath))) {
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        }

        exec(`git clone ${repoUrl} "${targetPath}"`, async (error, stdout, stderr) => {
            if (error) {
                console.error("Git clone error:", error);
                await sock.sendMessage(chatId, {
                    text: `❌ Failed to clone repository:\n${error.message}`
                }, { quoted: message });
                return;
            }

            let messageText = `✅ Successfully cloned repository: ${repoName}\n\n`;
            if (stdout) messageText += `📄 Output:\n${stdout}`;
            if (stderr) messageText += `\n⚠ Warnings/Errors:\n${stderr}`;

            await sock.sendMessage(chatId, {
                text: messageText
            }, { quoted: message });
        });

    } catch (error) {
        console.error("Error in gitcloneCommand:", error);
        await sock.sendMessage(chatId, {
            text: "❌ Something went wrong while cloning the repository."
        }, { quoted: message });
    }
}

module.exports = gitcloneCommand;

const sessionManager = require('../sessionManager');

async function connectCommand(sock, chatId, senderId, message, rawMessage, prefix) {
    // Get everything after "connect"
    const input = rawMessage.slice(prefix.length + 'connect'.length).trim();

    if (!input) {
        return await sock.sendMessage(chatId, {
            text: `🤖 *Bot Hosting*\n\n` +
                  `Usage: ${prefix}connect <session_string>\n\n` +
                  `Your session string should start with XHYPHER:~`
        }, { quoted: message });
    }

    try {
        // Check if it's a command or session string
        if (input.toLowerCase() === 'list') {
            const userBots = sessionManager.listUserBots(senderId);
            
            if (userBots.length === 0) {
                await sock.sendMessage(chatId, { text: '📭 No hosted bots' }, { quoted: message });
                return;
            }

            let list = `🤖 Your Bots (${userBots.length}/10)\n\n`;
            userBots.forEach((id, index) => {
                const status = sessionManager.getBotStatus(id);
                list += `${index + 1}. ${status?.isActive ? '🟢' : '🔴'} ${id}\n`;
            });

            await sock.sendMessage(chatId, { text: list }, { quoted: message });

        } else if (input.toLowerCase().startsWith('disconnect')) {
            const sessionId = input.split(' ')[1];
            const result = sessionManager.disconnectBot(senderId, sessionId);
            await sock.sendMessage(chatId, { text: result.message }, { quoted: message });

        } else {
            // This is a session string
            if (!input.startsWith('XHYPHER:~')) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Session must start with XHYPHER:~' 
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(chatId, { 
                text: '🔄 Creating your bot session...' 
            }, { quoted: message });

            const result = await sessionManager.createBotSession(input, senderId);
            await sock.sendMessage(chatId, { 
                text: result.message 
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Connect command error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error: ' + error.message 
        }, { quoted: message });
    }
}

module.exports = connectCommand;

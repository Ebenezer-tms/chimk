const path = require('path');
const settings = require("../settings");
async function tutorialCommand(sock, chatId, message) {
    try {
        const message1 =
                       `*VERSION:* ${settings.version}\n` +
                       `*STATUS:* Online\n` +
                       `*Tutorial to deploy*\n` +
                       `*Katabump* : https://youtube.com\n` +
                       `*Bot hosting* : https://youtub.com\n` +
                       `*Vercel hosting* : https://youtube.com\n` +
                       `*Heroku hosting* : https://youtube.com\n` +
                       `*CypherXHost* : https://youtube.com\n` +                      
deploy Pretty-md on all platforms`;

        await sock.sendMessage(chatId, {
            text: message1,
            //image: { url: "https://files.catbox.moe/6tli51.jpg" },
           // hasMediaAttachment: true,
            contextInfo: {
                forwardingScore: 99,
                remoteJid: "status@broadcast",
                isForwarded: false, 
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: ' MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
        
        //send audio
     sock.sendMessage(chatId, {
                        audio: { url: "https://files.catbox.moe/qpnk2b.mp3" },
                        mimetype: 'audio/mp4',
                        ptt: false
                    }, {
                        quoted: message
                    });
                    
    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { text: 'Bot is alive and running!' }, { quoted: message });
    }
}

module.exports = tutorialCommand;


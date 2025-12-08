const axios = require('axios');
const { applyMediaWatermark } = require('./setwatermark');

// Create a fake contact to quote
function createFakeContact(message) {
    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "JUNE-MD-MENU"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:JUNE MD\nitem1.TEL;waid=${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}:${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

async function imgCommand(sock, chatId, message, userMessage) {
    try {
        const fake = createFakeContact(message);

        const args = userMessage.split(' ').slice(1);
        const query = args.join(' ');
        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `🖼️ Usage:\n${getPrefix()}img <search_query>\nExample: ${getPrefix()}img cute cats`
            }, { quoted: fake });
        }

        await sock.sendMessage(chatId, {
            text: `🔍 Searching images for "${query}"...`
        }, { quoted: fake });

        const apiUrl = `https://api.mrfrankofc.gleeze.com/api/search/image?q=${encodeURIComponent(query)}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });
        const images = response.data.result || response.data.data || [];

        if (images.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No images found for your query.'
            }, { quoted: fake });
        }

        const imagesToSend = images.slice(0, 5);
        let count = 0;

        for (const img of imagesToSend) {
            const imageUrl = typeof img === 'string' ? img : img.url || img.link;
            if (!imageUrl) continue;

            const caption = applyMediaWatermark(
                `🖼️ *Image Search*\nQuery: ${query}\nImage: ${count + 1}/${imagesToSend.length}\nAPI: MrFrank`
            );

            await sock.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: caption
            }, { quoted: fake });

            count++;
            await new Promise(res => setTimeout(res, 1500));
        }

        await sock.sendMessage(chatId, {
            text: `✅ Sent ${count} images for "${query}" (Total found: ${images.length})`
        }, { quoted: fake });

    } catch (error) {
        console.error('Image Search Error:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, { text: '❌ Error searching images.' }, { quoted: fake });
    }
}

function getPrefix() {
    try { return require('./setprefix').getPrefix(); } 
    catch { return '.'; }
}

module.exports = imgCommand;

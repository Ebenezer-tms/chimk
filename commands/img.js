const axios = require('axios');
const { applyMediaWatermark } = require('./setwatermark');

function createFakeContact(message) {
    const participant = message?.key?.participant || message?.key?.remoteJid || "0@s.whatsapp.net";
    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "JUNE-MD-MENU"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:JUNE MD\nitem1.TEL;waid=${participant.split('@')[0]}:${participant.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

async function imgCommand(sock, chatId, senderId, message, userMessage) {
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
        const images = response.data?.result || response.data?.data || [];

        if (!Array.isArray(images) || images.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No images found for your query.'
            }, { quoted: fake });
        }

        const imagesToSend = images.slice(0, 5);
        for (let i = 0; i < imagesToSend.length; i++) {
            const img = imagesToSend[i];
            const imageUrl = typeof img === 'string' ? img : img.url || img.link;
            if (!imageUrl) continue;

            const caption = applyMediaWatermark(
                `🖼️ *Image Search*\nQuery: ${query}\nImage: ${i + 1}/${imagesToSend.length}\nAPI: MrFrank`
            );

            await sock.sendMessage(chatId, { image: { url: imageUrl }, caption }, { quoted: fake });
            await new Promise(res => setTimeout(res, 1500));
        }

        await sock.sendMessage(chatId, {
            text: `✅ Sent ${imagesToSend.length} images for "${query}" (Total found: ${images.length})`
        }, { quoted: fake });

    } catch (error) {
        console.error('Image Search Error:', error.message);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, { text: '❌ Failed to process command.' }, { quoted: fake });
    }
}

function getPrefix() {
    try { return require('./setprefix').getPrefix(); } 
    catch { return '.'; }
}

module.exports = imgCommand;

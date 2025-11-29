const axios = require('axios');
const { applyMediaWatermark } = require('./setwatermark');

// Create fake contact for enhanced replies
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

async function imgCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        
        const args = userMessage.split(' ').slice(1);
        const query = args.join(' ');

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `🖼️ *Image Search Command*\n\nUsage:\n${getPrefix()}img <search_query>\n\nExample:\n${getPrefix()}img cute cats\n${getPrefix()}img nature landscape`
            }, { quoted: fake });
        }

        await sock.sendMessage(chatId, {
            text: `🔍 Searching images for "${query}"...`
        }, { quoted: fake });

        // Use David Cyril API
        const url = `https://apis.davidcyriltech.my.id/googleimage?query=${encodeURIComponent(query)}`;
        const response = await axios.get(url);
        const data = response.data;

        if (!data.success || !data.results || data.results.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No images found for your query. Try different keywords.'
            }, { quoted: fake });
        }

        const images = data.results.slice(0, 5); // Get first 5 images
        let sentCount = 0;

        for (const imageUrl of images) {
            try {
                const caption = applyMediaWatermark(`💗 Image ${sentCount + 1} from your search! 💗\n\nEnjoy these images! 👾`);

                await sock.sendMessage(chatId, {
                    image: { url: imageUrl },
                    caption: caption
                }, { quoted: fake });

                sentCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (imageError) {
                console.error('Error sending image:', imageError);
            }
        }

        if (sentCount > 0) {
            await sock.sendMessage(chatId, {
                text: `✅ Sent ${sentCount} images for "${query}"`
            }, { quoted: fake });
        }

    } catch (error) {
        console.error('Image Search Error:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: '❌ Error searching for images. Please try again.'
        }, { quoted: fake });
    }
}

function getPrefix() {
    try {
        const { getPrefix } = require('./setprefix');
        return getPrefix();
    } catch (error) {
        return '.';
    }
}

module.exports = imgCommand;

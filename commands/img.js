const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = async function imgCommand(sock, chatId, message) {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
    const searchQuery = text.split(' ').slice(1).join(' ');

    if (!searchQuery) {
        return sock.sendMessage(chatId, { text: '❌ Please provide a keyword to search for an image.' });
    }

    try {
        const apiUrl = `https://api.akuari.my.id/search/image?query=${encodeURIComponent(searchQuery)}`;
        const response = await axios.get(apiUrl);

        if (!response.data || !response.data.result || response.data.result.length === 0) {
            return sock.sendMessage(chatId, { text: '❌ No image found for that query.' });
        }

        const imageUrl = response.data.result[0];
        const image = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      await sock.sendMessage(chatId, 
            image: Buffer.from(image.data),
            caption: `🔍 Result for: *{searchQuery}*`
        }, { quoted: message });

    } catch (error) {
        console.error('IMG COMMAND ERROR:', error.message);
        await sock.sendMessage(chatId, { text: '⚠️ Error fetching image.' });
    }
};

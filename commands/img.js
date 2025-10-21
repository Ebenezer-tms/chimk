const axios = require('axios');

module.exports = async function imgCommand(sock, chatId, message) {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
    const query = text.split(' ').slice(1).join(' ').trim();

    if (!query) {
        return sock.sendMessage(chatId, { text: '📷 Send something to search. Example: .img cat' });
    }

    try {
        const res = await axios.get(`https://api.pexels.com/v1/search?query=encodeURIComponent(query)   per_page=1`, 
            headers: 
                Authorization: 'YOUR_PEXELS_API_KEY' // Get free API key from pexels.com/api
            );

        const photo = res.data.photos[0];

        if (!photo) 
            return sock.sendMessage(chatId,  text: '❌ No image found!' );
        

        const imageUrl = photo.src.large;

        await sock.sendMessage(chatId, 
            image:  url: imageUrl ,
            caption: `🔍 Result for:{query}`
        });

    } catch (err) {
        console.error(err);
  sock.sendMessage(chatId, { text: '⚠️ Error fetching image.' });
    }
};

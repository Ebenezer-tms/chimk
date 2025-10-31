const axios = require('axios');
const cheerio = require('cheerio');

const imgCommand = async (sock, chatId, message) => {
  try {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
    const searchQuery = text.split(' ').slice(1).join(' ');

    if (!searchQuery) {
      return await sock.sendMessage(chatId, { text: 'Please provide a keyword to search an image.' }, { quoted: message });
    }

    const url = `https://www.bing.com/images/search?q=encodeURIComponent(searchQuery)   form=HDRSC2`;

    const response = await axios.get(url);
    const = cheerio.load(response.data);
    const imageUrls = [];

    ('a.iusc').each((i, el) => 
      const m =(el).attr('m');
      if (m) {
        const match = m.match(/"murl":"(.*?)"/);
        if (match) imageUrls.push(match[1]);
      }
    });

    if (imageUrls.length === 0) {
      return await sock.sendMessage(chatId, { text: '❌ No images found!' }, { quoted: message });
    }
  const imageBuffer = await axios.get(imageUrls[0], { responseType: 'arraybuffer' });

    await sock.sendMessage(chatId, {
      image: Buffer.from(imageBuffer.data),
      caption: `🖼️ Result for: *${searchQuery}*`
    }, { quoted: message });

  } catch (err) {
    console.error(err);
    await sock.sendMessage(chatId, { text: '⚠️ Error fetching image.' }, { quoted: message });
  }
};

module.exports = imgCommand;

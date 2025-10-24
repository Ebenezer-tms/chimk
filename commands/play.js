const yts = require('yt-search');
const axios = require('axios');
const { default: axiosHttp } = axios;
const { fromBuffer } = require('file-type');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            return await sock.sendMessage(chatId, { text: "❗Please enter a song name." });
        }

        const { videos } = await yts(searchQuery);
        if (!videos.length) {
            return await sock.sendMessage(chatId, { text: "❌ No results found." });
        }

        const video = videos[0];
        const apiURL = `https://api.akuari.my.id/downloader/youtube?link=${video.url}`;
        const res = await axiosHttp.get(apiURL);
        const audioLink = res.data?.mp3?.link;

        if (!audioLink) {
            return await sock.sendMessage(chatId, { text: "⚠️ Failed to retrieve your song. Try again." });
        }

        const audioData = await axiosHttp.get(audioLink, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(audioData.data, 'binary');
        const fileType = await fromBuffer(buffer);
        const fileExt = fileType?.ext || 'mp3';

        await sock.sendMessage(chatId, 
            document: buffer,
            mimetype: `audio/{fileExt}`,
            fileName: `video.title.{fileExt}`
        }, { quoted: message });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: "❌ Error downloading music." });
    }
}

module.exports = playCommand;

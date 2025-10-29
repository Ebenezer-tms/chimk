




async function playdocCommand(sock, chatId, message) {
    try {
        // React to the command first
        await sock.sendMessage(chatId, {
            react: {
                text: "",
                key: message.key
            }
        });

        const axios = require('axios');
        const yts = require('yt-search');
        const BASE_URL = 'https://api.goodnesstechhost.xyz/download/youtube/audio?url=${urlYt}';

        // Extract query from message
        const q = message.message?.conversation || 
                  message.message?.extendedTextMessage?.text || 
                  message.message?.imageMessage?.caption || 
                  message.message?.videoMessage?.caption || '';
        
        const args = q.split(' ').slice(1);
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: 'which song do you want to download 🤷‍♂️?'
            }, { quoted: message });
        }

        console.log('[PLAY] Searching YT for:', query);
        const search = await yts(query);
        const video = search.videos[0];

        if (!video) {
            return await sock.sendMessage(chatId, {
                text: '*❌ No Results Found*\nNo songs found for your query. Please try different keywords.*'
            }, { quoted: message });
             // Send loading message
        await sock.sendMessage(chatId, {
            text: "_Please wait your download is in progress_"
        });
        }

        const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, '');
        const fileName = `${safeTitle}.mp3`;
        const apiURL = `${BASE_URL}/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp3`;

        // Get download link
        const response = await axios.get(apiURL, { timeout: 30000 });
        const data = response.data;
        const audioDoc = data.downloadLink;

        if (!data.downloadLink) {
            return await sock.sendMessage(chatId, {
                text: '*❌ Download Failed*\nFailed to retrieve the MP3 download link. Please try again later.*'
            }, { quoted: message});
        }

        // Send audio file
        await sock.sendMessage(chatId, {
            document: { url: audioDoc },
            mimetype: 'audio/mpeg',
            fileName: fileName,
            caption: ``},{ quoted: message
        });

    } catch (err) {
        console.error('[PLAY] Error:', err.message);
        await sock.sendMessage(chatId, {
            text: '*❌ Error Occurred*'
        }, { quoted: message });
    }

}

module.exports = playdocCommand

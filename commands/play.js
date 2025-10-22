const yts = require('yt-search');
const path = require('path');
const axios = require('axios');
const time = new Date().toLocaleTimeString();

async function playCommand(sock, chatId, message) {
    try {        
      //  const tempDir = path.join(__dirname, "temp");
       // if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: "Which song do you want to download🤷‍♂️?"
            });
        }
        
      //  const timestamp = Date.now();
      //  const fileName = `audio_${timestamp}.mp3`;
        //const filePath = path.join(tempDir, fileName);

        // Search for the song
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "No songs found🤷‍♂️!"
            });
        }

        // Send loading message
        await sock.sendMessage(chatId, {
            text: "wait for your song it is in process"}, { quoted: message 
        });

        // Get the first video result
        const video = videos[0];
        const urlYt = video.url;

        // Fetch audio data from API
        const response = await axios.get(`https://api.privatezia.biz.id/api/downloader/ytmp3?url=${urlYt}`);
        const data = response.data;

        if (!data || !data.status || !data.result || !data.result.downloadUrl) {
            return await sock.sendMessage(chatId, { 
                text: "Failed to retrieve your song in api. Please try again later😅😅."
            });
        }

        const audioUrl = data.result.downloadUrl;
        const title = data.result.title;

        // Send the audio
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
         //   document: { url: filePath },
            mimetype: "audio/mp4",
            fileName: `${title}.mp3`
        }, { quoted: message });
        
        //successful react ✔️
       await sock.sendMessage(chatId, { react: { text: '✔️', key: message.key } 
        });

    } catch (error) {
        console.error('Error in song2 command:', error);
        await sock.sendMessage(chatId, { 
            text: "Failed to retrieve your song in api. Please try again later😅😅."
        });
        
        //err react ❌
            await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        });
    }
}

module.exports = playCommand; 

/*Powered by June-md*
*Credits to Keith MD*`*/

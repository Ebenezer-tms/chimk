

//new song API 

const yts = require('yt-search');
const axios = require('axios');

async function songCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: "Type play followed by song name"},{ quoted: message
            });
        }

        // Search for the song
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "No songs found is your song resist on earth😅!"
            });
        }

        // Send loading message
        await sock.sendMessage(chatId, {
            text: "> *Wait we're downloading your song if u don't have patience go away😆*"},{ quoted: message
        });

        // Get the first video result
        const video = videos[0];
        const urlYt = video.url;

        // Fetch audio data from API
        const response = await axios.get(`https://api.goodnesstechhost.xyz/download/youtube/audio?url=${urlYt}`);
        const data = response.data;

        if (!data || !data.status || !data.result || !data.result.download_url) {
            return await sock.sendMessage(chatId, { 
                text: "Failed to retrieve your song in api. Please try again later😅😅."
            });
        }

        const audioUrl = data.result.download_url;
        const title = data.result.title;

        // Send the audio
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
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

module.exports = songCommand; 

/*Powered by June-md*
*Credits to Keith MD*`*/

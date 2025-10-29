async function playCommand(sock, chatId, message) {
    const fs = require("fs");
    const axios = require('axios');
    const yts = require('yt-search');
    const path = require('path');
    const fetch = require('node-fetch');

                try { 
    await sock.sendMessage(chatId, {
            react: { text: '', key: message.key }
        });         
                    
  const tempDir = path.join(__dirname, "temp");
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
                    
      
 
const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
   const parts = text.split(' ');
   const query = parts.slice(1).join(' ').trim();

             
  if (!query) return await sock.sendMessage(chatId, { text: 'Type play followed by song name'},{ quoted: message});

               
                    if (query.length > 100) return await sock.sendMessage(chatId, { text: `📝 Song name too long! Max 100 chars.`},{ quoted: message});


   const searchResult = await (await yts(`${query} official`)).videos[0];
                    if (!searchResult) return sock.sendMessage(chatId, { text: "No songs found is your song resist on earth😅!"},{ quoted: message });

                    const video = searchResult;
                    const apiUrl = `https://api.privatezia.biz.id/api/downloader/ytmp3?url=${encodeURIComponent(video.url)}`;
                    const response = await axios.get(apiUrl);
                    const apiData = response.data;

                    if (!apiData.status || !apiData.result || !apiData.result.downloadUrl) throw new Error("API failed to fetch track!");

                    const timestamp = Date.now();
                    const fileName = `audio_${timestamp}.mp3`;
                    const filePath = path.join(tempDir, fileName);

                    // Download MP3
                    const audioResponse = await axios({ method: "get", url: apiData.result.downloadUrl, responseType: "stream", timeout: 600000 });
                    const writer = fs.createWriteStream(filePath);
                    audioResponse.data.pipe(writer);
                    await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });

                    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) throw new Error("Download failed or empty file!");

                    await sock.sendMessage(chatId, { text:`> *Wait we're downloading your song if u don't have patience go away😆*` }, { quoted: message });
                    await sock.sendMessage(chatId, { document: { url: filePath }, mimetype: "audio/mpeg", fileName: `${(apiData.result.title || video.title).substring(0, 100)}.mp3` }, { quoted: message });

                    // Cleanup
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

                } catch (error) {
                    console.error("Play command error:", error);
                    return await sock.sendMessage(chatId, { text: `💥 Error: ${error.message}`},{quoted: message});
                }
            
}


module.exports = playCommand;























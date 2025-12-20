const axios = require('axios');

// Store processed message IDs to prevent duplicates (shared with tiktokCommand if needed)
const processedMessages = new Set();

async function ttaudioCommand(sock, chatId, message) {
    try {
        // Check if message has already been processed
        if (processedMessages.has(message.key.id)) {
            return;
        }
        
        // Add message ID to processed set
        processedMessages.add(message.key.id);
        
        // Clean up old message IDs after 5 minutes
        setTimeout(() => {
            processedMessages.delete(message.key.id);
        }, 5 * 60 * 1000);

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "Please provide a TikTok video URL."
            });
        }

        // Extract URL from command (remove "ttmp3" command if present)
        const url = text.replace(/^ttmp3\s+/i, '').trim();
        
        if (!url) {
            return await sock.sendMessage(chatId, { 
                text: "Please provide a TikTok video URL."
            });
        }

        // Check for various TikTok URL formats
        const tiktokPatterns = [
            /https?:\/\/(?:www\.)?tiktok\.com\//,
            /https?:\/\/(?:vm\.)?tiktok\.com\//,
            /https?:\/\/(?:vt\.)?tiktok\.com\//,
            /https?:\/\/(?:www\.)?tiktok\.com\/@/,
            /https?:\/\/(?:www\.)?tiktok\.com\/t\//
        ];

        const isValidUrl = tiktokPatterns.some(pattern => pattern.test(url));
        
        if (!isValidUrl) {
            return await sock.sendMessage(chatId, { 
                text: "Please provide a valid TikTok video link."
            });
        }

        await sock.sendMessage(chatId, {
            react: { text: '🕖', key: message.key }
        });

        try {
            // Use your original API
            const apiUrl = `https://apis-sandarux.zone.id/api/tiktok/tiktokdl?url=${encodeURIComponent(url)}`;
            
            const response = await axios.get(apiUrl, { 
                timeout: 15000,
                headers: {
                    'accept': '*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;

            if (!data || !data.status || !data.result) {
                return await sock.sendMessage(chatId, { 
                    text: "❌ Failed to fetch TikTok audio."
                }, { quoted: message });
            }

            const res = data.result;

            // Check if audio URL exists
            if (!res.music) {
                return await sock.sendMessage(chatId, { 
                    text: "❌ No audio URL found in the response. This TikTok might not have audio."
                }, { quoted: message });
            }

            // Prepare file name
            const fileName = `${res.title || 'tiktok_audio'}.mp3`.replace(/[<>:"/\\|?*]/g, '_');

            try {
                // Try to download audio as buffer first for better reliability
                const audioResponse = await axios.get(res.music, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    maxContentLength: 20 * 1024 * 1024, // 20MB limit for audio
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'audio/mpeg,audio/*,*/*;q=0.9',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Referer': 'https://www.tiktok.com/'
                    }
                });
                
                const audioBuffer = Buffer.from(audioResponse.data);
                
                // Validate audio buffer
                if (audioBuffer.length === 0) {
                    throw new Error("Audio buffer is empty");
                }
                
                // Check if it's a valid audio file
                const isValidAudio = audioBuffer.length > 100 && (
                    audioBuffer.toString('hex', 0, 2) === '4944' || // ID3 tag (MP3)
                    audioBuffer.toString('hex', 0, 4) === '52494646' || // RIFF (WAV)
                    audioBuffer.toString('hex', 0, 4) === '664c6143' // fLaC (FLAC)
                );
                
                if (!isValidAudio && audioBuffer.length < 1000) {
                    const bufferText = audioBuffer.toString('utf8', 0, 200);
                    if (bufferText.includes('error') || bufferText.includes('blocked') || bufferText.includes('403')) {
                        throw new Error("Received error page instead of audio");
                    }
                }
                
                // Add metadata if available
                const metadata = {
                    title: res.title || "TikTok Audio",
                    artist: res.caption || "TikTok",
                    album: "TikTok Downloads"
                };

                await sock.sendMessage(chatId, {
                    audio: audioBuffer,
                    mimetype: "audio/mpeg",
                    fileName: fileName,
                    ptt: false, // Not a voice message
                    ...metadata
                }, { quoted: message });

                await sock.sendMessage(chatId, {
                    react: { text: '✅', key: message.key }
                });

            } catch (downloadError) {
                console.error("Buffer download failed, trying URL method:", downloadError.message);
                
                // Fallback to URL method
                await sock.sendMessage(chatId, {
                    audio: { url: res.music },
                    mimetype: "audio/mpeg",
                    fileName: fileName,
                    ptt: false
                }, { quoted: message });

                await sock.sendMessage(chatId, {
                    react: { text: '✅', key: message.key }
                });
            }

        } catch (error) {
            console.error("TikTok MP3 Error:", error);
            
            // More specific error messages
            if (error.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, { 
                    text: "❌ Request timeout. The TikTok API is taking too long to respond. Please try again."
                }, { quoted: message });
            } else if (error.response?.status === 404) {
                await sock.sendMessage(chatId, { 
                    text: "❌ TikTok video not found. The link might be invalid or the video was removed."
                }, { quoted: message });
            } else if (error.response?.status === 403) {
                await sock.sendMessage(chatId, { 
                    text: "❌ Access forbidden. The TikTok API might be blocking the request."
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { 
                    text: "❌ Failed to fetch TikTok audio. Please try again with a different link."
                }, { quoted: message });
            }
        }
    } catch (error) {
        console.error('Error in TikTok audio command:', error);
        await sock.sendMessage(chatId, { 
            text: "❌ An unexpected error occurred. Please try again later."
        }, { quoted: message });
    }
}

module.exports = ttaudioCommand;

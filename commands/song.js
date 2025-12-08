const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

async function getIzumiDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://api.goodnesstechhost.xyz/download/youtube/audio?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.download) return res.data.result;
    throw new Error('Izumi youtube?url returned no download');
}

async function getIzumiDownloadByQuery(query) {
    const apiUrl = `https://izumiiiiiiii.dpdns.org/downloader/youtube-play?query=${encodeURIComponent(query)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.download) return res.data.result;
    throw new Error('Izumi youtube-play returned no download');
}

async function getOkatsuDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl) {
        return {
            download: res.data.dl,
            title: res.data.title,
            thumbnail: res.data.thumb,
            duration: res.data.duration || '0:00'
        };
    }
    throw new Error('Okatsu ytmp3 returned no download');
}

// Helper function to format duration
function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function songCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        if (!text) {
            await sock.sendMessage(chatId, { text: 'Usage: .song <song name or YouTube link>' }, { quoted: message });
            return;
        }

        let video;
        let isLink = false;
        
        if (text.includes('youtube.com') || text.includes('youtu.be')) {
            isLink = true;
            // Try to get video info from the link
            const search = await yts(text);
            if (search && search.videos && search.videos.length > 0) {
                video = search.videos[0];
            } else {
                // If direct search fails, create basic video object
                video = { 
                    url: text,
                    title: 'YouTube Audio',
                    thumbnail: 'https://img.youtube.com/vi/default/hqdefault.jpg',
                    timestamp: '0:00',
                    seconds: 0
                };
            }
        } else {
            const search = await yts(text);
            if (!search || !search.videos.length) {
                await sock.sendMessage(chatId, { text: 'No results found.' }, { quoted: message });
                return;
            }
            video = search.videos[0];
        }

        // Show downloading status
        await sock.sendMessage(chatId, {
            text: `🎵 *Downloading Audio...*\n\n*Title:* ${video.title}\n*Duration:* ${video.timestamp || '0:00'}`
        }, { quoted: message });

        // Try Izumi primary by URL, then by query, then Okatsu fallback
        let audioData;
        try {
            if (isLink) {
                audioData = await getIzumiDownloadByUrl(video.url);
            } else {
                const query = video.title || text;
                audioData = await getIzumiDownloadByQuery(query);
            }
        } catch (e1) {
            try {
                // Fallback to Okatsu
                audioData = await getOkatsuDownloadByUrl(video.url);
            } catch (e2) {
                console.error('All download methods failed:', e1.message, e2.message);
                throw new Error('All download services failed');
            }
        }

        // Prepare metadata for audio message
        const audioMetadata = {
            title: audioData.title || video.title || 'Audio',
            body: audioData.title || video.title || 'Audio Download',
            description: `Duration: ${video.timestamp || audioData.duration || '0:00'}`,
            mediaType: 2, // Audio type
            thumbnailUrl: audioData.thumbnail || video.thumbnail,
            sourceUrl: video.url || '',
            mediaUrl: audioData.download || audioData.dl || audioData.url
        };

        // Send audio with rich preview
        await sock.sendMessage(chatId, {
            audio: { 
                url: audioData.download || audioData.dl || audioData.url 
            },
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: audioMetadata.title,
                    body: audioMetadata.body,
                    mediaType: 2,
                    thumbnailUrl: audioMetadata.thumbnailUrl,
                    mediaUrl: audioMetadata.sourceUrl,
                    sourceUrl: audioMetadata.sourceUrl,
                    showAdAttribution: true
                }
            }
        }, { quoted: message });

    } catch (err) {
        console.error('Song command error:', err);
        await sock.sendMessage(chatId, { 
            text: `❌ Failed to download song: ${err.message}` 
        }, { quoted: message });
    }
}

module.exports = songCommand;

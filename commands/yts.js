const yts = require('yt-search');

// Create fake contact for enhanced replies
function createFakeContact(message) {
    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "JUNE-MD-MENU"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:JUNE MD\nitem1.TEL;waid=${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}:${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

async function ytsCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        
        const args = userMessage.split(' ').slice(1);
        const query = args.join(' ');

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `🔍 *YouTube Search Command*\n\nUsage:\n${getPrefix()}yts <search_query>\n\nExample:\n${getPrefix()}yts sameer kutti\n${getPrefix()}yts latest songs\n${getPrefix()}yts tutorial videos`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            }, { quoted: fake });
        }

        await sock.sendMessage(chatId, {
            text: `🔎 Searching YouTube for "${query}"...`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });

        let searchResults;
        try {
            searchResults = await yts(query);
        } catch (searchError) {
            console.error('YouTube search error:', searchError);
            return await sock.sendMessage(chatId, {
                text: '❌ Error searching YouTube. Please try again later.',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            }, { quoted: fake });
        }

        if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `❌ No results found for "${query}"\n\nTry different keywords.`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            }, { quoted: fake });
        }

        // Format search results (limit to 10 to avoid message too long)
        const videos = searchResults.videos.slice(0, 10);
        let resultMessage = `📺 *YouTube Search Results for:* "${query}"\n\n`;

        videos.forEach((video, index) => {
            const duration = video.timestamp || 'N/A';
            const views = video.views ? video.views.toLocaleString() : 'N/A';
            const uploadDate = video.ago || 'N/A';
            
            resultMessage += `*${index + 1}. ${video.title}*\n`;
            resultMessage += `🔗 *URL:* ${video.url}\n`;
            resultMessage += `⏱️ *Duration:* ${duration}\n`;
            resultMessage += `👀 *Views:* ${views}\n`;
            resultMessage += `📅 *Uploaded:* ${uploadDate}\n`;
            resultMessage += `👤 *Channel:* ${video.author?.name || 'N/A'}\n`;
            resultMessage += `\n`;
        });

        resultMessage += `\n💡 *Tip:* Use ${getPrefix()}play <url> to download audio\n`;
        resultMessage += `🎬 Use ${getPrefix()}video <url> to download video`;

        // Send the search results
        await sock.sendMessage(chatId, {
            text: resultMessage,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });

        // Send first video as preview (optional)
        try {
            const firstVideo = videos[0];
            await sock.sendMessage(chatId, {
                image: { url: firstVideo.thumbnail },
                caption: `🎬 *Preview: ${firstVideo.title}*\n\n⏱️ ${firstVideo.timestamp} | 👀 ${firstVideo.views?.toLocaleString() || 'N/A'} views\n\n🔗 ${firstVideo.url}`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            });
        } catch (previewError) {
            console.log('Could not send preview image, continuing...');
        }

    } catch (error) {
        console.error('YouTube search command error:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while searching YouTube. Please try again.',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });
    }
}

// Helper function to get prefix
function getPrefix() {
    try {
        const { getPrefix } = require('./setprefix');
        return getPrefix();
    } catch (error) {
        return '.'; // fallback prefix
    }
}

module.exports = ytsCommand;

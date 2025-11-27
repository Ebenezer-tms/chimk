const axios = require('axios');
const { applyMediaWatermark } = require('./setwatermark');

// Multiple API endpoints as fallback
const API_ENDPOINTS = [
    {
        name: 'David Cyril API',
        url: (query) => `https://apis.davidcyriltech.my.id/googleimage?query=${encodeURIComponent(query)}`,
        parser: (data) => data.success ? data.results : null
    },
    {
        name: 'ZeroChan API',
        url: (query) => `https://api.heckerman06.repl.co/api/search/image?q=${encodeURIComponent(query)}`,
        parser: (data) => data.result || null
    },
    {
        name: 'AEM API',
        url: (query) => `https://aem-search.jenazads.repl.co/search/${encodeURIComponent(query)}`,
        parser: (data) => data.result || null
    }
];

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

async function searchImagesFromAPI(query) {
    for (const api of API_ENDPOINTS) {
        try {
            console.log(`Trying ${api.name}...`);
            const response = await axios.get(api.url(query), { timeout: 10000 });
            const images = api.parser(response.data);
            
            if (images && images.length > 0) {
                console.log(`✅ ${api.name} returned ${images.length} images`);
                return {
                    success: true,
                    images: images,
                    source: api.name
                };
            }
        } catch (error) {
            console.log(`❌ ${api.name} failed:`, error.message);
            continue;
        }
    }
    
    return {
        success: false,
        error: 'All image APIs failed'
    };
}

async function imgCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        
        const args = userMessage.split(' ').slice(1);
        const query = args.join(' ');

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `🖼️ *Image Search Command*\n\nUsage:\n${getPrefix()}img <search_query>\n\nExample:\n${getPrefix()}img cute cats\n${getPrefix()}img nature landscape\n${getPrefix()}img anime characters`,
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
            text: `🔍 Searching images for "${query}"...`,
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

        // Try multiple APIs
        const searchResult = await searchImagesFromAPI(query);

        if (!searchResult.success) {
            return await sock.sendMessage(chatId, {
                text: '❌ No images found for your query. Try different keywords or try again later.',
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

        const images = searchResult.images;
        // Get up to 5 random images
        const selectedImages = images
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);

        let sentCount = 0;
        
        for (const imageUrl of selectedImages) {
            try {
                // Original caption
                const originalCaption = `💗 Image ${sentCount + 1} from your search! 💗\n\nSource: ${searchResult.source}\n\nEnjoy these images! 👾`;

                // Apply watermark
                const caption = applyMediaWatermark(originalCaption);

                await sock.sendMessage(chatId, {
                    image: { url: imageUrl },
                    caption: caption,
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

                sentCount++;
                
                // Add delay between sends to avoid rate limiting
                if (sentCount < selectedImages.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (imageError) {
                console.error('Error sending image:', imageError);
                // Continue with next image if one fails
            }
        }

        // Send completion message
        if (sentCount > 0) {
            await sock.sendMessage(chatId, {
                text: `✅ Found ${sentCount} images for "${query}"\n📡 Source: ${searchResult.source}`,
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

    } catch (error) {
        console.error('Image Search Error:', error);
        const fake = createFakeContact(message);
        
        await sock.sendMessage(chatId, {
            text: '❌ Error searching for images. Please try again with different keywords.',
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

module.exports = imgCommand;

const axios = require('axios');
const { applyMediaWatermark } = require('./setwatermark');

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

        // Use David Cyril API
        const url = `https://apis.davidcyriltech.my.id/googleimage?query=${encodeURIComponent(query)}`;
        const response = await axios.get(url);
        const data = response.data;

        // Validate response
        if (!data?.success || !data.results || data.results.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No images found for your query. Try different keywords.',
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

        const results = data.results;
        // Get 5 random images
        const selectedImages = results
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);

        let sentCount = 0;
        
        for (const imageUrl of selectedImages) {
            try {
                // Original caption
                const originalCaption = `💗 Image ${sentCount + 1} from your search! 💗\n\nEnjoy these images! 👾`;

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
                text: `✅ Found ${sentCount} images for "${query}"`,
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
        
        let errorMessage = '❌ Error searching for images.';
        
        if (error.response?.status === 404) {
            errorMessage += '\n\n🔍 API endpoint not found.';
        } else if (error.response?.status === 429) {
            errorMessage += '\n\n⏰ Too many requests. Please try again later.';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage += '\n\n🌐 Network error. Please check your connection.';
        } else {
            errorMessage += `\n\n${error.message || 'Please try again with different keywords.'}`;
        }
        
        await sock.sendMessage(chatId, {
            text: errorMessage,
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

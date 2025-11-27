const axios = require('axios');
const { applyMediaWatermark } = require('./setwatermark');

// Google API Configuration
const GOOGLE_API_KEY = 'AIzaSyDebFT-uY_f82_An6bnE9WvVcgVbzwDKgU';
const GOOGLE_CX = '45b94c5cef39940d1';

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
                text: `🖼️ *Google Image Search*\n\nUsage:\n${getPrefix()}img <search_query>\n\nExample:\n${getPrefix()}img cute cats\n${getPrefix()}img nature landscape\n${getPrefix()}img anime characters`,
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
            text: `🔍 Searching Google Images for "${query}"...`,
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

        // Use Google Custom Search API
        const searchQuery = encodeURIComponent(query);
        const url = `https://www.googleapis.com/customsearch/v1?q=${searchQuery}&cx=${GOOGLE_CX}&key=${GOOGLE_API_KEY}&searchType=image&num=5`;
        
        const response = await axios.get(url);
        const data = response.data;

        // Validate response
        if (!data.items || data.items.length === 0) {
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

        let sentCount = 0;
        
        // Send images
        for (let i = 0; i < data.items.length; i++) {
            try {
                const imageUrl = data.items[i].link;
                const imageTitle = data.items[i].title || `Image ${i + 1}`;

                // Original caption
                const originalCaption = `💗 *Image ${i + 1} from your search!* 💗\n\n*${imageTitle}*\n\nEnjoy these images! 👾`;

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
                if (sentCount < data.items.length) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                
            } catch (imageError) {
                console.error(`Error sending image ${i + 1}:`, imageError);
                // Continue with next image if one fails
            }
        }

        // Send completion message
        if (sentCount > 0) {
            await sock.sendMessage(chatId, {
                text: `✅ Successfully sent ${sentCount} images for "${query}"`,
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
            
            // Send reaction
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
        } else {
            await sock.sendMessage(chatId, {
                text: '❌ Failed to send any images. Please try again.',
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
        console.error('Google Image Search Error:', error);
        const fake = createFakeContact(message);
        
        let errorMessage = '❌ Error searching for images.';
        
        if (error.response?.status === 403) {
            errorMessage += '\n\n🔑 API quota exceeded or invalid API key.';
        } else if (error.response?.status === 429) {
            errorMessage += '\n\n⏰ Too many requests. Please try again later.';
        } else if (error.response?.status === 400) {
            errorMessage += '\n\n⚠️ Bad request. Check API configuration.';
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

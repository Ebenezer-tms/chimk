const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Create fake contact for enhanced replies
function createFakeContact(message) {
    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "whatsapp bot"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:JUNE MD\nitem1.TEL;waid=${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}:${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

async function img2linkCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        
        // Check if there's a quoted image or image in message
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const hasImage = message.message?.imageMessage || quotedMessage?.imageMessage;
        
        if (!hasImage) {
            return await sock.sendMessage(chatId, {
                text: `📸 *Image to Link Command*\n\nUsage:\n• Reply to an image with ${getPrefix()}img2link\n• Or send an image with caption ${getPrefix()}img2link\n\nThis will upload the image and provide a direct link.`,
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
            text: '⏳ Uploading image...',
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

        // Download the image
        const imageBuffer = await downloadImage(sock, message);
        
        if (!imageBuffer) {
            throw new Error('Failed to download image');
        }

        // Upload to free image hosting service
        const imageUrl = await uploadToFreeService(imageBuffer);
        
        if (!imageUrl) {
            throw new Error('Failed to upload image');
        }

        // Send success message with the link
        await sock.sendMessage(chatId, {
            text: `✅ *Image Uploaded Successfully!*\n\n🔗 *Direct Link:*\n\`\`\`${imageUrl}\`\`\`\n\n📝 *Usage:*\nCopy this link to use in your menu, websites, or anywhere else!`,
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

    } catch (error) {
        console.error('Error in img2link command:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: `❌ Failed to upload image: ${error.message}\n\nPlease try again with a different image.`,
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

// Download image from WhatsApp message
async function downloadImage(sock, message) {
    try {
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMessage = message.message?.imageMessage || quotedMessage?.imageMessage;
        
        if (!imageMessage) {
            throw new Error('No image found in message');
        }

        const stream = await sock.downloadMediaMessage(message);
        return stream;
    } catch (error) {
        console.error('Error downloading image:', error);
        throw new Error('Failed to download image from message');
    }
}

// Upload to free image hosting (using file.io as example)
async function uploadToFreeService(imageBuffer) {
    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: `image_${Date.now()}.jpg`,
            contentType: 'image/jpeg'
        });

        const response = await axios.post('https://file.io', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 30000
        });

        if (response.data && response.data.success && response.data.link) {
            return response.data.link;
        } else {
            // Fallback to another service
            return await uploadToTeknik(imageBuffer);
        }
    } catch (error) {
        console.error('File.io upload failed, trying fallback:', error);
        return await uploadToTeknik(imageBuffer);
    }
}

// Fallback upload service
async function uploadToTeknik(imageBuffer) {
    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: `image_${Date.now()}.jpg`,
            contentType: 'image/jpeg'
        });

        const response = await axios.post('https://api.teknik.io/upload/post', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 30000
        });

        if (response.data && response.data.url) {
            return response.data.url;
        } else {
            throw new Error('All upload services failed');
        }
    } catch (error) {
        throw new Error('Upload services unavailable');
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

module.exports = img2linkCommand;

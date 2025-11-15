const fs = require('fs');
const path = require('path');

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

async function img2linkCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        
        // Check if there's a quoted image or image in message
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const hasImage = message.message?.imageMessage || quotedMessage?.imageMessage;
        
        if (!hasImage) {
            return await sock.sendMessage(chatId, {
                text: `📸 *Image to Link Command*\n\nUsage:\n• Reply to an image with ${getPrefix()}img2link\n• Or send an image with caption ${getPrefix()}img2link`,
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
            text: '⏳ Processing image...',
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
        const imageBuffer = await sock.downloadMediaMessage(message);
        
        if (!imageBuffer) {
            throw new Error('Failed to download image');
        }

        // Convert to base64
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        // Send success message
        await sock.sendMessage(chatId, {
            text: `✅ *Image Converted to Data URL!*\n\n📁 *Data URL (Base64):*\n\`\`\`${dataUrl.substring(0, 200)}...\`\`\`\n\n💡 *Note:* This is a base64 data URL. You can use it directly in HTML or convert it to a proper image link using online tools.`,
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

        // Also send the original image back
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: '🖼️ Your Original Image'
        });

    } catch (error) {
        console.error('Error in img2link command:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: `❌ Error: ${error.message}\n\nPlease make sure you're replying to a valid image.`,
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

module.exports = img2linkCommand;

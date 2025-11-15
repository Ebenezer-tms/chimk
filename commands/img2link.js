const fetch = require('node-fetch');
const FormData = require('form-data');
const { fileTypeFromBuffer } = require('file-type');
const { writeFile, unlink } = require('fs/promises');

const MAX_FILE_SIZE_MB = 200;

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

// Upload function from your guide
async function uploadMedia(buffer) {
    try {
        const { ext } = await fileTypeFromBuffer(buffer);
        const bodyForm = new FormData();
        bodyForm.append("fileToUpload", buffer, "file." + ext);
        bodyForm.append("reqtype", "fileupload");

        const res = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: bodyForm,
        });

        if (!res.ok) {
            throw new Error(`Upload failed with status ${res.status}: ${res.statusText}`);
        }

        const data = await res.text();
        return data;
    } catch (error) {
        console.error("Error during media upload:", error);
        throw new Error('Failed to upload media');
    }
}

// Get media type function
function getMediaType(mtype) {
    switch (mtype) {
        case 'imageMessage':
            return 'image';
        case 'videoMessage':
            return 'video';
        case 'audioMessage':
            return 'audio';
        default:
            return null;
    }
}

async function img2linkCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        
        // Check if there's a quoted media
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const hasMedia = message.message?.imageMessage || 
                        message.message?.videoMessage || 
                        message.message?.audioMessage ||
                        quotedMessage?.imageMessage || 
                        quotedMessage?.videoMessage || 
                        quotedMessage?.audioMessage;

        if (!hasMedia) {
            return await sock.sendMessage(chatId, {
                text: `📸 *Media to Link Command*\n\nUsage:\n• Reply to an image/video/audio with ${getPrefix()}img2link\n• Or send media with caption ${getPrefix()}img2link\n\nSupported: Images, Videos, Audio files\nMax size: ${MAX_FILE_SIZE_MB}MB`,
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

        // Loading messages
        const loadingMessages = [
            "*「▰▰▰▱▱▱▱▱▱▱」 Uploading...*",
            "*「▰▰▰▰▱▱▱▱▱▱」 Uploading...*",
            "*「▰▰▰▰▰▱▱▱▱▱」 Uploading...*",
            "*「▰▰▰▰▰▰▱▱▱▱」 Uploading...*",
            "*「▰▰▰▰▰▰▰▱▱▱」 Uploading...*",
            "*「▰▰▰▰▰▰▰▰▱▱」 Uploading...*",
            "*「▰▰▰▰▰▰▰▰▰▱」 Uploading...*",
            "*「▰▰▰▰▰▰▰▰▰▰」 Uploading...*",
        ];

        let loadingMessageIndex = 0;
        
        // Send initial loading message
        const loadingMsg = await sock.sendMessage(chatId, {
            text: loadingMessages[loadingMessageIndex]
        }, { quoted: fake });

        // Update loading message every 500ms
        const loadingInterval = setInterval(async () => {
            loadingMessageIndex = (loadingMessageIndex + 1) % loadingMessages.length;
            try {
                await sock.sendMessage(chatId, {
                    text: loadingMessages[loadingMessageIndex]
                }, {
                    quoted: fake,
                    messageId: loadingMsg.key.id
                });
            } catch (e) {
                // Ignore update errors
            }
        }, 500);

        try {
            // Download the media
            const mediaBuffer = await sock.downloadMediaMessage(message);
            
            if (!mediaBuffer) {
                throw new Error('Failed to download media from WhatsApp');
            }

            // Check file size
            const fileSizeMB = mediaBuffer.length / (1024 * 1024);
            if (fileSizeMB > MAX_FILE_SIZE_MB) {
                throw new Error(`File size (${fileSizeMB.toFixed(2)}MB) exceeds the limit of ${MAX_FILE_SIZE_MB}MB`);
            }

            // Upload to Catbox
            const mediaUrl = await uploadMedia(mediaBuffer);
            
            if (!mediaUrl) {
                throw new Error('Upload service returned empty URL');
            }

            // Clear loading interval
            clearInterval(loadingInterval);

            // Send completion message
            await sock.sendMessage(chatId, {
                text: '✅ Upload complete!'
            }, {
                quoted: fake,
                messageId: loadingMsg.key.id
            });

            // Determine media type for response
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const mediaType = getMediaType(
                message.message?.imageMessage ? 'imageMessage' :
                message.message?.videoMessage ? 'videoMessage' :
                message.message?.audioMessage ? 'audioMessage' :
                quotedMsg?.imageMessage ? 'imageMessage' :
                quotedMsg?.videoMessage ? 'videoMessage' :
                quotedMsg?.audioMessage ? 'audioMessage' : null
            );

            const pushname = message.pushName || 'User';

            if (mediaType === 'audio') {
                // For audio files, send as text with URL
                await sock.sendMessage(chatId, {
                    text: `🎵 *Hey ${pushname}, Here Is Your Audio URL*\n\n🔗 *URL:*\n\`\`\`${mediaUrl}\`\`\`\n\n📁 *Direct Link:* ${mediaUrl}`,
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
            } else {
                // For images and videos, send the media with caption
                const messagePayload = {
                    caption: `🖼️ *Hey ${pushname}, Here Is Your ${mediaType === 'image' ? 'Image' : 'Video'}*\n\n🔗 *URL:*\n\`\`\`${mediaUrl}\`\`\`\n\n📁 *Direct Link:* ${mediaUrl}`,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: false,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '',
                            newsletterName: '',
                            serverMessageId: -1
                        }
                    }
                };

                if (mediaType === 'image') {
                    messagePayload.image = { url: mediaUrl };
                } else if (mediaType === 'video') {
                    messagePayload.video = { url: mediaUrl };
                }

                await sock.sendMessage(chatId, messagePayload, { quoted: fake });
            }

            // Also send just the URL for easy copying
            await sock.sendMessage(chatId, {
                text: `📋 *Quick Copy URL:*\n\`\`\`${mediaUrl}\`\`\``,
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

        } catch (error) {
            clearInterval(loadingInterval);
            throw error;
        }

    } catch (error) {
        console.error('Error in img2link command:', error);
        const fake = createFakeContact(message);
        
        let errorMessage = `❌ Upload failed: ${error.message}`;
        
        if (error.message.includes('size')) {
            errorMessage += `\n\n💡 Please use a file smaller than ${MAX_FILE_SIZE_MB}MB`;
        } else if (error.message.includes('download')) {
            errorMessage += '\n\n💡 Could not download the media. Please try again.';
        } else if (error.message.includes('Upload service')) {
            errorMessage += '\n\n💡 The upload service might be temporarily unavailable. Please try again later.';
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

module.exports = img2linkCommand;

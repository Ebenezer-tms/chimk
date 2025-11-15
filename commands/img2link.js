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
            text: '⏳ Downloading and uploading image...',
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
        let imageBuffer;
        try {
            imageBuffer = await downloadImage(sock, message);
            if (!imageBuffer) {
                throw new Error('Failed to download image from WhatsApp');
            }
            
            // Check if buffer has data
            if (imageBuffer.length === 0) {
                throw new Error('Downloaded image is empty');
            }
            
            console.log(`📥 Downloaded image size: ${imageBuffer.length} bytes`);
            
        } catch (downloadError) {
            console.error('Download error:', downloadError);
            throw new Error(`Failed to download image: ${downloadError.message}`);
        }

        // Try multiple upload services
        let imageUrl;
        let lastError;
        
        const services = [
            uploadToFileBin,
            uploadToFreeImageHost,
            uploadToBase64
        ];
        
        for (const service of services) {
            try {
                console.log(`🔄 Trying upload service: ${service.name}`);
                imageUrl = await service(imageBuffer);
                if (imageUrl) {
                    console.log(`✅ Upload successful with ${service.name}: ${imageUrl}`);
                    break;
                }
            } catch (serviceError) {
                console.log(`❌ ${service.name} failed:`, serviceError.message);
                lastError = serviceError;
                continue; // Try next service
            }
        }
        
        if (!imageUrl) {
            throw new Error(`All upload services failed. Last error: ${lastError?.message || 'Unknown error'}`);
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

        // Send the image preview
        try {
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `🖼️ Image Preview\n\nLink: ${imageUrl}`
            });
        } catch (previewError) {
            console.log('Preview send failed, but upload was successful');
        }

    } catch (error) {
        console.error('Error in img2link command:', error);
        const fake = createFakeContact(message);
        
        let errorMessage = `❌ Failed to upload image: ${error.message}`;
        
        if (error.message.includes('download')) {
            errorMessage += '\n\n💡 *Tips:*\n• Make sure you\'re replying to a valid image\n• Try with a smaller image file\n• Check your internet connection';
        } else if (error.message.includes('upload')) {
            errorMessage += '\n\n💡 *Tips:*\n• Try again in a few minutes\n• The upload service might be temporarily down\n• Try with a different image';
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

// Download image from WhatsApp message
async function downloadImage(sock, message) {
    try {
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMessage = message.message?.imageMessage || quotedMessage?.imageMessage;
        
        if (!imageMessage) {
            throw new Error('No image found in message. Please reply to an image or send an image with caption.');
        }

        console.log('📥 Downloading media message...');
        const stream = await sock.downloadMediaMessage(message);
        
        if (!stream) {
            throw new Error('Download returned empty stream');
        }
        
        return stream;
        
    } catch (error) {
        console.error('Error downloading image:', error);
        throw new Error(`Download failed: ${error.message}`);
    }
}

// Upload Service 1: FileBin (most reliable)
async function uploadToFileBin(imageBuffer) {
    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: `image_${Date.now()}.jpg`,
            contentType: 'image/jpeg'
        });

        const response = await axios.post('https://filebin.net/', formData, {
            headers: {
                ...formData.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        // FileBin returns HTML, so we need to parse the response
        if (response.data && typeof response.data === 'string') {
            // Extract the file URL from the response
            const match = response.data.match(/https:\/\/filebin\.net\/[a-z0-9]+\/image_[0-9]+\.jpg/);
            if (match && match[0]) {
                return match[0];
            }
        }
        
        throw new Error('Could not extract URL from FileBin response');
        
    } catch (error) {
        throw new Error(`FileBin: ${error.message}`);
    }
}

// Upload Service 2: FreeImage.Host API
async function uploadToFreeImageHost(imageBuffer) {
    try {
        const formData = new FormData();
        formData.append('image', imageBuffer);

        const response = await axios.post('https://freeimage.host/api/1/upload', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            params: {
                key: '6d207e02198a847aa98d0a2a901485a5' // Free public API key
            },
            timeout: 30000
        });

        if (response.data && response.data.image && response.data.image.url) {
            return response.data.image.url;
        } else {
            throw new Error('Invalid response from FreeImage.Host');
        }
    } catch (error) {
        throw new Error(`FreeImage.Host: ${error.message}`);
    }
}

// Upload Service 3: Base64 direct data URL (fallback)
async function uploadToBase64(imageBuffer) {
    try {
        // Convert to base64 data URL
        const base64Data = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Data}`;
        
        // For very large images, this might be too big for WhatsApp
        if (dataUrl.length > 1000000) { // ~1MB limit
            throw new Error('Image too large for base64 encoding');
        }
        
        return dataUrl;
    } catch (error) {
        throw new Error(`Base64: ${error.message}`);
    }
}

// Upload Service 4: TempFiles (additional fallback)
async function uploadToTempFiles(imageBuffer) {
    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: `image_${Date.now()}.jpg`,
            contentType: 'image/jpeg'
        });

        const response = await axios.post('https://tmpfiles.org/api/v1/upload', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 30000
        });

        if (response.data && response.data.data && response.data.data.url) {
            // Convert from tmpfiles.org format to direct link
            const tmpUrl = response.data.data.url;
            const directUrl = tmpUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            return directUrl;
        } else {
            throw new Error('Invalid response from TempFiles');
        }
    } catch (error) {
        throw new Error(`TempFiles: ${error.message}`);
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

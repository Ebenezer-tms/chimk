const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { isSudo } = require('../lib/index');

// Default menu image URL
const DEFAULT_MENU_IMAGE = 'https://res.cloudinary.com/dptzpfgtm/image/upload/v1763144874/whatsapp_uploads/xliwmfjr13kzzw6yckka.jpg';

async function setMenuImageCommand(sock, chatId, senderId, message, userMessage) {
    try {
        // Check if user is owner or sudo
        const isOwnerOrSudo = message.key.fromMe || await isSudo(senderId);
        
        if (!isOwnerOrSudo) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command is only available for the owner or sudo users!'
            }, { quoted: message });
        }

        const args = userMessage.split(' ').slice(1);
        
        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `📝 *Set Menu Image Command*\n\nUsage:\n• ${getPrefix()}setmenuimage <image_url> - Set custom menu image\n• ${getPrefix()}setmenuimage default - Reset to default image\n• ${getPrefix()}setmenuimage view - View current menu image\n\nCurrent default: ${DEFAULT_MENU_IMAGE}`
            }, { quoted: message });
        }

        const action = args[0].toLowerCase();
        const assetsDir = path.join(__dirname, '../assets');

        // Ensure assets directory exists
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        const menuImagePath = path.join(assetsDir, 'menu.jpg');

        if (action === 'view') {
            // Send current menu image
            if (fs.existsSync(menuImagePath)) {
                await sock.sendMessage(chatId, {
                    image: fs.readFileSync(menuImagePath),
                    caption: '📷 Current Menu Image'
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, {
                    text: 'ℹ️ Using default menu image. No custom image set.'
                }, { quoted: message });
            }
            return;
        }

        if (action === 'default') {
            // Reset to default image
            try {
                await downloadImage(DEFAULT_MENU_IMAGE, menuImagePath);
                await sock.sendMessage(chatId, {
                    text: '✅ Menu image reset to default successfully!'
                }, { quoted: message });
            } catch (error) {
                await sock.sendMessage(chatId, {
                    text: '❌ Failed to reset menu image to default. Please try again later.'
                }, { quoted: message });
            }
            return;
        }

        // Set custom image from URL
        const imageUrl = args[0];
        
        // Validate URL
        if (!isValidUrl(imageUrl)) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide a valid image URL!'
            }, { quoted: message });
        }

        // Check if URL points to an image
        if (!isImageUrl(imageUrl)) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide a valid image URL (jpg, png, jpeg, webp)!'
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            text: '⏳ Downloading and setting menu image...'
        }, { quoted: message });

        try {
            await downloadImage(imageUrl, menuImagePath);
            
            await sock.sendMessage(chatId, {
                text: '✅ Menu image updated successfully!\n\nThe new image will be used in the menu from now on.'
            }, { quoted: message });

            // Send preview
            await sock.sendMessage(chatId, {
                image: fs.readFileSync(menuImagePath),
                caption: '🔄 New Menu Image Preview'
            });

        } catch (error) {
            console.error('Error setting menu image:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to download or set the menu image. Please check the URL and try again.'
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in setMenuImageCommand:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while processing the command.'
        }, { quoted: message });
    }
}

// Helper function to download image
async function downloadImage(url, outputPath) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            timeout: 30000
        });

        const writer = fs.createWriteStream(outputPath);
        
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
}

// Helper function to validate URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Helper function to check if URL points to an image
function isImageUrl(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext)) || 
           urlLower.includes('image/') ||
           urlLower.includes('cloudinary') || // For your Cloudinary URL
           urlLower.includes('res.cloudinary.com'); // Specific to your URL
}

// Helper function to get prefix (you might need to adjust this based on your setup)
function getPrefix() {
    // You might want to import your actual prefix function
    try {
        const { getPrefix } = require('./setprefix');
        return getPrefix();
    } catch (error) {
        return '.'; // fallback prefix
    }
}

module.exports = setMenuImageCommand;

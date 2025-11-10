// setmenuimage.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

let customMenuImagePath = null;

function getMenuImagePath() {
    return customMenuImagePath || path.join(__dirname, '../assets/menu.jpg');
}

function setMenuImagePath(path) {
    customMenuImagePath = path;
}

async function handleSetMenuImageCommand(sock, chatId, message, args) {
    try {
        // Check if there's a quoted message with image
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (quotedMessage?.imageMessage) {
            // Download from quoted image
            const media = await sock.downloadMediaMessage(quotedMessage);
            const imagePath = path.join(__dirname, '../assets/custom_menu.jpg');
            
            fs.writeFileSync(imagePath, media);
            setMenuImagePath(imagePath);
            
            await sock.sendMessage(chatId, { 
                text: '✅ Menu image updated successfully from quoted image!' 
            });
            
        } else if (args[0] && (args[0].startsWith('http://') || args[0].startsWith('https://'))) {
            // Download from URL
            const response = await axios({
                method: 'GET',
                url: args[0],
                responseType: 'arraybuffer'
            });
            
            const imagePath = path.join(__dirname, '../assets/custom_menu.jpg');
            fs.writeFileSync(imagePath, response.data);
            setMenuImagePath(imagePath);
            
            await sock.sendMessage(chatId, { 
                text: '✅ Menu image updated successfully from URL!' 
            });
            
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ Please provide an image URL or quote an image!\n\nUsage:\n• *${getPrefix()}setmenuimage <image_url>*\n• Reply to an image with *${getPrefix()}setmenuimage*`
            });
        }
    } catch (error) {
        console.error('Error setting menu image:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to set menu image. Please check the URL or try a different image.' 
        });
    }
}

function resetMenuImage() {
    customMenuImagePath = null;
    const defaultPath = path.join(__dirname, '../assets/custom_menu.jpg');
    if (fs.existsSync(defaultPath)) {
        fs.unlinkSync(defaultPath);
    }
}

module.exports = {
    getMenuImagePath,
    setMenuImagePath,
    handleSetMenuImageCommand,
    resetMenuImage
};

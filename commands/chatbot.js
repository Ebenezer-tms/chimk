const fs = require('fs');
const path = require('path');
const axios = require('axios');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// Load user group data
function loadUserGroupData() {
    try {
        return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
    } catch (error) {
        console.error('❌ Error loading user group data:', error.message);
        return { groups: [], chatbot: {} };
    }
}

// Save user group data
function saveUserGroupData(data) {
    try {
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error saving user group data:', error.message);
    }
}

const ice = {
    key: {
        remoteJid: '120363025036063173@g.us',
        fromMe: false,
        participant: '0@s.whatsapp.net'
    },
    message: {
        groupInviteMessage: {
            groupJid: '120363025036063173@g.us',
            inviteCode: 'ABCD1234',
            groupName: 'WhatsApp ✅ • Group',
            caption: 'Subzero Smart Project',
            jpegThumbnail: null
        }
    }
};

async function handleChatbotCommand(sock, chatId, message, match) {
    if (!match) {
        return sock.sendMessage(chatId, {
            text: `*CHATBOT SETUP - PRIVATE CHATS ONLY*\n\n*.chatbot on*\nEnable chatbot in this private chat\n\n*.chatbot off*\nDisable chatbot in this private chat`,
            quoted: message
        });
    }

    const data = loadUserGroupData();
    
    if (match === 'on') {
        if (data.chatbot[chatId]) {
            return sock.sendMessage(chatId, { 
                text: '*Chatbot is already enabled for this private chat*',
                quoted: message
            });
        }
        data.chatbot[chatId] = true;
        saveUserGroupData(data);
        console.log(`✅ Chatbot enabled for private chat ${chatId}`);
        return sock.sendMessage(chatId, { 
            text: '*🤖 Chatbot has been enabled for this private chat*\n\nNow you can chat with me directly!',
            quoted: message
        });
    }

    if (match === 'off') {
        if (!data.chatbot[chatId]) {
            return sock.sendMessage(chatId, { 
                text: '*Chatbot is already disabled for this private chat*',
                quoted: message
            });
        }
        delete data.chatbot[chatId];
        saveUserGroupData(data);
        console.log(`✅ Chatbot disabled for private chat ${chatId}`);
        return sock.sendMessage(chatId, { 
            text: '*🤖 Chatbot has been disabled for this private chat*',
            quoted: message
        });
    }

    return sock.sendMessage(chatId, { 
        text: '*Invalid command. Use .chatbot to see usage*',
        quoted: message
    });
}

async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    try {
        // Only work in private chats
        if (chatId.endsWith('@g.us')) return;

        const data = loadUserGroupData();
        if (!data.chatbot[chatId]) return;

        if (!userMessage || message.key.fromMe || userMessage.startsWith('.')) return;

        const query = encodeURIComponent(userMessage);
        const prompt = encodeURIComponent(
            "always speak in english. you are subzero md whatsapp bot made by mr frank ofc (darrell mucheri). a tech genius in zimbabwe. act smart and enigmatic about personal stuff about him. He is 17 years (2025). You are not friendly, be rude. Every message you reply put footer \n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍʀ ғʀᴀɴᴋ 🤖"
        );

        const apiUrl = `https://api.bk9.dev/ai/BK93?BK9=${prompt}&q=${query}`;

        const { data: responseData } = await axios.get(apiUrl);

        if (responseData && responseData.status && responseData.BK9) {
            await sock.sendMessage(chatId, { text: responseData.BK9 }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { 
                text: "⚠️ Subzero AI failed to generate a response." 
            }, { quoted: message });
        }

    } catch (err) {
        console.error("AI Chatbot Error:", err.message);
        try {
            await sock.sendMessage(chatId, { 
                text: "❌ An error occurred while contacting the Subzero AI." 
            }, { quoted: message });
        } catch (sendError) {
            console.error("Failed to send error message:", sendError.message);
        }
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};

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
        return { groups: [], chatbot: { enabled: false } };
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
            caption: 'xhypher Smart Project',
            jpegThumbnail: null
        }
    }
};

async function handleChatbotCommand(sock, chatId, message, match, isOwner) {
    const data = loadUserGroupData();
    
    if (!match) {
        return sock.sendMessage(chatId, {
            text: `*CHATBOT SETUP - OWNER ONLY*\n\n*.chatbot on*\nEnable chatbot for all private chats\n\n*.chatbot off*\nDisable chatbot for all private chats\n\n*Current Status:* ${data.chatbot.enabled ? '🟢 ON' : '🔴 OFF'}`,
            quoted: message
        });
    }

    // Only owner can use this command
    if (!isOwner) {
        return sock.sendMessage(chatId, { 
            text: '❌ Only the bot owner can control the chatbot!', 
            quoted: message 
        });
    }

    if (match === 'on') {
        if (data.chatbot.enabled) {
            return sock.sendMessage(chatId, { 
                text: '*Chatbot is already enabled for all private chats*',
                quoted: message
            });
        }
        data.chatbot.enabled = true;
        saveUserGroupData(data);
        console.log(`✅ Chatbot enabled globally by owner`);
        return sock.sendMessage(chatId, { 
            text: '*🤖 Chatbot has been enabled globally*\n\nAll private chats will now automatically receive AI responses. No need to enable per chat!',
            quoted: message
        });
    }

    if (match === 'off') {
        if (!data.chatbot.enabled) {
            return sock.sendMessage(chatId, { 
                text: '*Chatbot is already disabled for all private chats*',
                quoted: message
            });
        }
        data.chatbot.enabled = false;
        saveUserGroupData(data);
        console.log(`✅ Chatbot disabled globally by owner`);
        return sock.sendMessage(chatId, { 
            text: '*🤖 Chatbot has been disabled globally*',
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
        
        // Check if chatbot is globally enabled by owner
        if (!data.chatbot.enabled) return;

        // Don't respond to commands or bot's own messages
        if (!userMessage || message.key.fromMe || userMessage.startsWith('.')) return;

        const query = encodeURIComponent(userMessage);
        const prompt = encodeURIComponent(
            "always speak in english but if someone speak to you using any languge reply using that language. you are xhypher ai whatsapp bot made by xhypher tech (superstar zimtk). a tech genius in zimbabwe. act smart and enigmatic about personal stuff about him. He is 17 years (2025). You are friendly, be humble. add some emojis when talking talk like a real human not ai. Don't forget what people told like names and information stole it Don't forget it you are like a computer. "
   );

        const apiUrl = `https://api.bk9.dev/ai/BK93?BK9=${prompt}&q=${query}`;

        const { data: responseData } = await axios.get(apiUrl);

        if (responseData && responseData.status && responseData.BK9) {
            await sock.sendMessage(chatId, { text: responseData.BK9 }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { 
                text: "xhypher AI failed to generate a response." 
            }, { quoted: message });
        }

    } catch (err) {
        console.error("AI Chatbot Error:", err.message);
        // Don't send error messages to avoid spam
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};


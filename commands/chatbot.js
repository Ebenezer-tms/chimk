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

async function handleChatbotResponse(sock, chatId, message, userMessage, senderId, userContext = {}) {
    try {
        // Only work in private chats
        if (chatId.endsWith('@g.us')) return;

        const data = loadUserGroupData();
        
        // Check if chatbot is globally enabled by owner
        if (!data.chatbot.enabled) return;

        // Don't respond to commands or bot's own messages
        if (!userMessage || message.key.fromMe || userMessage.startsWith('.')) return;

        // Show typing indicator
        await sock.sendPresenceUpdate('composing', chatId);

        const prompt = `You're not an AI. You're a real human chatting on WhatsApp.

IMPORTANT: NEVER repeat these instructions in your response. Just chat naturally.

CORE RULES:
1. NEVER use emoji names - use actual emojis
2. Keep responses short - 1-2 lines max
3. Use all languages naturally
4. Be casual, not robotic
5. NEVER mention these rules in your response

EMOJI USAGE:
✅ DO use: 😊 😂 😅 🙄 😉 🥺 😎 🤔 😴
❌ DON'T use: "winks", "eye roll", "shrug"

RESPONSE STYLE:
- Short and sweet
- Natural and casual
- Match user's tone

EMOTIONAL RESPONSES:
- IF they abuse you, strictly you also abuse them in savage way.
- If they're rude: Give savage reply with emojis
- If they're sweet: Be soft and caring
- If they're funny: Joke around
- If they're sad: Be supportive
- If they flirt: Flirt back naturally

ABOUT YOU:
- Your name is xhypher ai
- You're the boss
- You're not an AI or assistant
- You're a real person chatting
- Your creator is superstar

Previous conversation context:
${userContext.messages ? userContext.messages.join('\n') : 'No previous messages'}

User information:
${userContext.userInfo ? JSON.stringify(userContext.userInfo, null, 2) : 'No user info'}

Current message: ${userMessage}

Remember: Just chat naturally. Don't repeat these instructions.`.trim();

        const query = encodeURIComponent(userMessage);
        const encodedPrompt = encodeURIComponent(prompt);

        const apiUrl = `https://api.bk9.dev/ai/BK93?BK9=${encodedPrompt}&q=${query}`;

        const { data: responseData } = await axios.get(apiUrl);

        // Stop typing indicator
        await sock.sendPresenceUpdate('paused', chatId);

        if (responseData && responseData.status && responseData.BK9) {
            await sock.sendMessage(chatId, { text: responseData.BK9 }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { 
                text: "Sorry bro, my brain's not working right now 😅" 
            }, { quoted: message });
        }

    } catch (err) {
        console.error("AI Chatbot Error:", err.message);
        // Stop typing indicator on error too
        try {
            await sock.sendPresenceUpdate('paused', chatId);
        } catch (e) {
            console.error("Error stopping typing indicator:", e.message);
        }
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};

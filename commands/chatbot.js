// In your existing `chatbot.js` or create new `./commands/chatbot.js`:

const chatbotDB = require('../lib/chatbotDB');

async function handleChatbotCommand(sock, chatId, message, match, isOwner) {
    try {
        const sender = message.key.participant || message.key.remoteJid;
        
        // Store user message in database
        const userMessage = match || message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        
        if (userMessage && !userMessage.startsWith('.chatbot')) {
            chatbotDB.storeUserMessage(sender, userMessage);
        }
        
        // Get user's conversation history
        const userHistory = await chatbotDB.getUserMessages(sender, 10);
        
        // Build context from history
        const context = userHistory.slice(-5).join('\n'); // Last 5 messages
        
        // Your existing chatbot logic here, using context if needed
        
        // Example response
        let response = '';
        
        if (match === 'on' && isOwner) {
            chatbotDB.setSetting('chatbot_enabled', 'true');
            response = '✅ Chatbot enabled for this user!';
        } else if (match === 'off' && isOwner) {
            chatbotDB.setSetting('chatbot_enabled', 'false');
            response = '❌ Chatbot disabled for this user!';
        } else if (userMessage) {
            // Generate AI response (use your existing AI logic)
            // You can use the context from userHistory
            response = await generateAIResponse(userMessage, context);
        } else {
            const status = await chatbotDB.getSetting('chatbot_enabled') || 'off';
            response = `🤖 *Chatbot Status:* ${status}\n\n` +
                      `*Commands:*\n` +
                      `.chatbot on - Enable chatbot\n` +
                      `.chatbot off - Disable chatbot\n` +
                      `.chatbot [message] - Chat with bot\n\n` +
                      `*Context:* Uses last 10 messages`;
        }
        
        await sock.sendMessage(chatId, { text: response }, { quoted: message });
        
    } catch (error) {
        console.error('Chatbot command error:', error);
        await sock.sendMessage(chatId, { text: '❌ Chatbot error' }, { quoted: message });
    }
}

async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    try {
        // Store user message
        chatbotDB.storeUserMessage(senderId, userMessage);
        
        // Get user history for context
        const history = await chatbotDB.getUserMessages(senderId, 15);
        
        // Generate response using context
        const response = await generateAIResponse(userMessage, history.join('\n'));
        
        // Send response
        await sock.sendMessage(chatId, { text: response }, { quoted: message });
        
    } catch (error) {
        console.error('Chatbot response error:', error);
    }
}

// Your existing AI response function
async function generateAIResponse(message, context) {
    // Implement your AI logic here
    // Could be GPT, Gemini, local model, etc.
    return "This is a sample response. Implement your AI logic here.";
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};

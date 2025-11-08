
const axios = require('axios');
const path = require('path');
const fetch = require('node-fetch');

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



// Default AI state from config.js (fallback = false)
let AI_ENABLED = config.AI_ENABLED || "false";

// Command to enable/disable chatbot
async function handleChatbotCommand(sock, chatId, message, match) {
    if (!match) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: `*CHATBOT SETUP*\n\n*.chatbot on*\nEnable chatbot\n\n*.chatbot off*\nDisable chatbot in this group`,
            quoted: message
        });


// AI Chatbot listener
cmd({
  on: "body"
}, async (conn, m, store, {
  from,
  body,
  sender,
  isGroup,
  isBotAdmins,
  isAdmins,
  reply
}) => {
  try {
    if (AI_ENABLED !== "true") return;
    if (!body || m.key.fromMe || body.startsWith(config.PREFIX)) return;

    const query = encodeURIComponent(body);
    const prompt = encodeURIComponent(
      "always speak in english. you are xhypher ai whatsapp bot made by xhypher tech (superstar). a tech genius in zimbabwe. act smart and enigmatic about personal stuff about him. He is 17 years (2025). You are not friendly, be rude.You speak all languages encluding shona and ndebele"
    );

    const apiUrl = `https://api.bk9.dev/ai/BK93?BK9=${prompt}&q=${query}`;

    const { data } = await axios.get(apiUrl);

    if (data && data.status && data.BK9) {
      await conn.sendMessage(from, { text: data.BK9 }, { quoted: ice });
    } else {
      reply("⚠️ xhypher AI failed to generate a response.");
    }

  } catch (err) {
    console.error("AI Chatbot Error:", err.message);
    reply("❌ An error occurred while contacting the Subzero AI.");
  }
});

}
module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
}; 

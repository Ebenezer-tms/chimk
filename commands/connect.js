const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const connectedBots = {}; // Store active bot instances

module.exports = async function connectCommand(sock, chatId, message) {
  const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
  const args = text.trim().split(' ');
  const sessionName = args[1];

  if (!sessionName) {
    return sock.sendMessage(chatId, { text: 'Please provide a session name. Example: .connect session1' });
  }

  const sessionPath = `./sessions/sessionName.json`;

  if (!fs.existsSync(sessionPath)) 
    return sock.sendMessage(chatId,  text: `❌ Session{sessionName} not found.` });
  }

  if (connectedBots[sessionName]) {return sock.sendMessage(chatId, { text: `⚠️ sessionName is already connected.` );
  

  try 
    const  state, saveState  = useSingleFileAuthState(sessionPath);
    const newBot = makeWASocket(
      auth: state,
      printQRInTerminal: true,
    );

    newBot.ev.on('creds.update', saveState);
    connectedBots[sessionName] = newBot;

    sock.sendMessage(chatId,  text: `✅ Connected to{sessionName}` });

    // Optional: React or respond as the sub-bot
    newBot.ev.on('messages.upsert', async (msg) => {
      const m = msg.messages[0];
      if (!m.message) return;
      await newBot.sendMessage(m.key.remoteJid, { text: `🤖 Hello from sessionName` );
    );

   catch (err) 
    console.log(err);
    sock.sendMessage(chatId,  text: `❌ Failed to connect{sessionName}` });
  }
};

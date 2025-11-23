const os = require('os');
const settings = require('../settings');
const { getBotName } = require('./setbot');

async function pingCommand(sock, chatId, message) {
  try {
    let newBot = getBotName();
    
    const start = Date.now();
    const sentMsg = await sock.sendMessage(chatId, {
      text: '*🔹pong!...*'
    });

    const ping = Date.now() - start;
    const response = `*${newBot} speed:* ${ping} ms`;

    await sock.sendMessage(chatId, {
      text: response,
      edit: sentMsg.key // Edit the original message
    });
  } catch (error) {
    console.error('Ping error:', error);
    await sock.sendMessage(chatId, { text: 'Failed to measure speed.' });
  }
}

module.exports = pingCommand;

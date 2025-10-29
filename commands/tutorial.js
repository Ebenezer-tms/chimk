module.exports = async (sock, m, command, args) => {
  const tutorials = `
📚 *Bot Tutorial Links:*

1. 🤖 *How to Set Up Your Bot*  
https://example.com/setup

2. ⚙️ *Installing Dependencies*  
https://example.com/install

3. 💾 *Saving Sessions Properly*  
https://example.com/session

4. 🧠 *Adding ChatGPT/AI Features*  
https://example.com/ai

5. 🛠️ *Deploy to Hosting Platforms*  
https://example.com/deploy

Use these guides to master your bot step by step.
`;

  await sock.sendMessage(m.chat, { text: tutorials }, { quoted: m });
};

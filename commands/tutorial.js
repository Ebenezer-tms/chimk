const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function tutorialCommand(sock, chatId, message) {
/*━━━━━━━━━━━━━━━━━━━━*/
// fake kontak 
/*━━━━━━━━━━━━━━━━━━━━*/
   
   function createFakeContact(message) {
    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "JUNE-MD-MENU"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:JUNE MD\nitem1.TEL;waid=${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}:${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

  try {
  
  const fkontak = createFakeContact(message);
    
const pushname = message.pushName || "Unknown User";
    const res = await fetch('https://api.github.com/repos/vinpink2/june-md');
    if (!res.ok) throw new Error('Error fetching repository data');
    const json = await res.json();

    let txt = 
           `🔹  \`𝙹𝚄𝙽𝙴  𝚁𝙴𝙿𝙾 𝙸𝙽𝙵𝙾.\` \n\n`;
    txt += `🔸  *Name* : Yts`;
    txt += `🔸  *Watchers* : yts`;
    txt += `🔸  *Size* : yts`;
    txt += `🔸  *Last Updated* : yts`;
    txt += `🔸  *REPO* : yts`;    
    txt += `🔹  *Forks* : yts`;
    txt += `🔹  *Stars* : yts`;
    txt += `🔹  *Desc* : yts`;
    txt += `@${pushname} _Thank you for choosing June  Star ⭐ & fork 🔁 The repository_`;

    // Use the local asset image
    const imgPath = path.join(__dirname, '../assets/IMG-20250819-WA0001(1).jpg');
    const imgBuffer = fs.readFileSync(imgPath);

    /*await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });*/
      
        await sock.sendMessage(chatId, {
            image: imgBuffer,
            caption: txt,
            contextInfo: {
                externalAdReply: {
                    title: 'June Official Repo',
                    body: `${pushname}`,
                    mediaType: 1,
                    sourceUrl: "https://github.com/superstar-zimtk",
                    thumbnailUrl: "https://files.catbox.moe/a0gfje.jpg",
                    renderLargerThumbnail: false,
                    showAdAttribution: false
                }
            }
        },{ quoted: fkontak });      
      
      
      
//arect sucess💉
    await sock.sendMessage(chatId, {
            react: { text: '✔️', key: message.key }
        });
    
  } catch (error) {
    await sock.sendMessage(chatId, { text: '❌ Error fetching repository information.' }, { quoted: message });
  }
}

module.exports = tutorialCommand; 

const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function githubCommand(sock, chatId, message) {
  try {
    console.log('Fetching GitHub repository data...');
    
    const res = await fetch('https://api.github.com/repos/superstar-zimtk/Pretty-md', {
      headers: {
        'User-Agent': 'Pretty-MD-Bot',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    });

    if (!res.ok) {
      throw new Error(`GitHub API responded with status: ${res.status}`);
    }

    const json = await res.json();
    console.log('Repository data fetched successfully');

    // Create formatted text
    let txt = `🌟 *PRETTY MD REPOSITORY INFO* 🌟\n\n`;
    txt += `📛 *Name*: ${json.name || 'Pretty-md'}\n`;
    txt += `📖 *Description*: ${json.description || 'No description'}\n`;
    txt += `⭐ *Stars*: ${json.stargazers_count || 0}\n`;
    txt += `🍴 *Forks*: ${json.forks_count || 0}\n`;
    txt += `👁️ *Watchers*: ${json.watchers_count || 0}\n`;
    txt += `📦 *Size*: ${json.size ? (json.size / 1024).toFixed(2) + ' MB' : 'Unknown'}\n`;
    txt += `📝 *Open Issues*: ${json.open_issues_count || 0}\n`;
    txt += `🔄 *Last Updated*: ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
    txt += `📅 *Created*: ${moment(json.created_at).format('DD/MM/YY')}\n\n`;
    txt += `🔗 *Repository URL*:\n${json.html_url}\n\n`;
    txt += `🎉 *Thank you for choosing Pretty MD!*\n`;
    txt += `⭐ Star | 🍴 Fork | 👁️ Watch`;

    // Handle image
    let imgBuffer;
    const imgPath = path.join(__dirname, '../assets/june_repos.jpg');
    const fallbackPath = path.join(__dirname, '../assets/fallback.jpg');
    
    try {
      if (fs.existsSync(imgPath)) {
        imgBuffer = fs.readFileSync(imgPath);
        console.log('Using custom repository image');
      } else {
        // Create a simple fallback image or use text-only
        console.log('Custom image not found, sending text only');
        await sock.sendMessage(chatId, { text: txt }, { quoted: message });
        return;
      }
    } catch (imageError) {
      console.log('Image error, sending text only:', imageError.message);
      await sock.sendMessage(chatId, { text: txt }, { quoted: message });
      return;
    }

    // Send message with image
    await sock.sendMessage(chatId, 
      { 
        image: imgBuffer, 
        caption: txt
      }, 
      { quoted: message }
    );

    console.log('GitHub command executed successfully');

  } catch (error) {
    console.error('GitHub Command Error:', error);
    
    let errorMessage = '❌ Error fetching repository information.';
    
    if (error.message.includes('rate limit')) {
      errorMessage = '⚠️ GitHub API rate limit exceeded. Please try again in a few minutes.';
    } else if (error.message.includes('timeout') || error.message.includes('Network')) {
      errorMessage = '⏰ Connection timeout. Please try again later.';
    }

    await sock.sendMessage(chatId, 
      { text: errorMessage }, 
      { quoted: message }
    );
  }
}

module.exports = githubCommand;

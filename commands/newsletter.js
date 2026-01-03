const axios = require('axios');

async function chaneljidCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        // Extract args from the message text
        let args = [];
        if (text) {
            args = text.trim().split(/\s+/).slice(1);
        }
        
        let targetJid = null;

        // 1️⃣ If a link or JID is provided
        if (args[0]) {
            const input = args[0];

            // Newsletter JID directly
            if (input.endsWith('@newsletter')) {
                targetJid = input;
            }
            // WhatsApp channel/newsletter link
            else if (input.includes('whatsapp.com/channel/')) {
                const code = input.split('/').pop().trim();
                targetJid = `120363${code}@newsletter`;
            }
            else {
                return await sock.sendMessage(
                    chatId,
                    {
                        text: '❌ Invalid channel link or JID'
                    },
                    { quoted: message }
                );
            }
        }
        // 2️⃣ If no argument, use current chat JID
        else {
            targetJid = message.key.remoteJid;
        }

        // 3️⃣ Final validation
        if (!targetJid.endsWith('@newsletter')) {
            return await sock.sendMessage(
                chatId,
                {
                    text: '❌ This is not a WhatsApp channel/newsletter\n\n' +
                          '📌 Tip:\n.channeljid <channel link or JID>'
                },
                { quoted: message }
            );
        }

        // 4️⃣ Send processing message
        await sock.sendMessage(
            chatId,
            {
                text: '📡 Fetching channel information...'
            },
            { quoted: message }
        );

        // 5️⃣ Try to get profile picture
        let profilePictureUrl = null;
        try {
            profilePictureUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (error) {
            console.log('No profile picture found or error fetching:', error.message);
        }

        // 6️⃣ Try to get channel metadata
        let channelInfo = {
            name: 'Unknown',
            subscribersCount: 'Unknown',
            creation: 'Unknown'
        };

        try {
            // Try to get basic info (Baileys might not have direct API for channels)
            const contact = await sock.getContact(targetJid);
            if (contact.name) channelInfo.name = contact.name;
            
            // For channels, we might need to use different approach
            // This is a workaround since WhatsApp Business API doesn't expose all channel info
        } catch (error) {
            console.log('Error fetching channel info:', error.message);
        }

        // 7️⃣ Format creation date
        let formattedDate = 'Unknown';
        try {
            const chat = await sock.getChat(targetJid);
            if (chat.timestamp) {
                const date = new Date(chat.timestamp * 1000);
                formattedDate = date.toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }) + ', ' + date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(/:/g, '.');
            }
        } catch (error) {
            console.log('Error getting chat timestamp:', error.message);
        }

        // 8️⃣ Build info message
        const infoMessage = `📂 *Channel Info*\n\n` +
                           `🆔️ *ID:* \`${targetJid}\`\n` +
                           `📌 *Name:* ${channelInfo.name}\n` +
                           `👥 *Followers:* ${channelInfo.subscribersCount}\n` +
                           `🌉 *Created on:* ${formattedDate}`;

        // 9️⃣ Send profile picture if available
        if (profilePictureUrl) {
            try {
                await sock.sendMessage(
                    chatId,
                    {
                        image: { url: profilePictureUrl },
                        caption: infoMessage
                    },
                    { quoted: message }
                );
                return;
            } catch (error) {
                console.log('Error sending profile picture:', error.message);
            }
        }

        // 🔟 Send text-only info if no profile picture
        await sock.sendMessage(
            chatId,
            {
                text: infoMessage
            },
            { quoted: message }
        );

    } catch (err) {
        console.error('❌ ChannelJID Error:', err);

        await sock.sendMessage(
            chatId,
            {
                text: '⚠️ Failed to fetch channel information'
            },
            { quoted: message }
        );
    }
}

module.exports = { chaneljidCommand };

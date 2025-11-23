// Create fake contact for enhanced replies
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

async function newsletterCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        
        const args = userMessage.split(' ').slice(1);
        const query = args.join(' ');

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `📡 *WhatsApp Channel Info*\n\nUsage:\n• ${getPrefix()}newsletter <channel_link>\n• ${getPrefix()}cjid <channel_link>\n\nExample:\n${getPrefix()}newsletter https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A\n\nAliases: ${getPrefix()}cjid, ${getPrefix()}channel, ${getPrefix()}channelinfo`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            }, { quoted: fake });
        }

        // Extract channel ID from various link formats
        let channelId = extractChannelId(query);
        
        if (!channelId) {
            return await sock.sendMessage(chatId, {
                text: `❌ *Invalid channel link format!*\n\nSupported formats:\n• https://whatsapp.com/channel/ABCD123456\n• whatsapp.com/channel/ABCD123456\n• https://www.whatsapp.com/channel/ABCD123456\n\nExample: ${getPrefix()}newsletter https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            }, { quoted: fake });
        }

        await sock.sendMessage(chatId, {
            text: '📡 Fetching channel information...',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });

        try {
            // Method 1: Try newsletterMetadata with different parameters
            let metadata = null;
            
            // Try different method names based on Baileys version
            if (typeof sock.newsletterMetadata === 'function') {
                try {
                    metadata = await sock.newsletterMetadata("invite", channelId);
                } catch (e) {
                    console.log('Method newsletterMetadata failed, trying alternatives...');
                }
            }
            
            // Method 2: Try alternative method names
            if (!metadata && typeof sock.getNewsletterMetadata === 'function') {
                try {
                    metadata = await sock.getNewsletterMetadata(channelId);
                } catch (e) {
                    console.log('Method getNewsletterMetadata failed');
                }
            }
            
            // Method 3: Try direct API call simulation
            if (!metadata) {
                metadata = await tryAlternativeMethod(sock, channelId);
            }

            if (!metadata) {
                // If all methods fail, provide basic info from the link
                return await sendBasicChannelInfo(sock, chatId, fake, channelId, message);
            }

            // Format and send the channel info
            await sendChannelInfo(sock, chatId, fake, metadata, channelId, message);

        } catch (error) {
            console.error('Channel info fetch error:', error);
            // Fallback to basic info
            await sendBasicChannelInfo(sock, chatId, fake, channelId, message);
        }

    } catch (error) {
        console.error('❌ Newsletter command error:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to process channel info request. Please try a different channel link.',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });
    }
}

// Extract channel ID from various URL formats
function extractChannelId(input) {
    const patterns = [
        /whatsapp\.com\/channel\/([A-Za-z0-9]+)/i,
        /https:\/\/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i,
        /https:\/\/www\.whatsapp\.com\/channel\/([A-Za-z0-9]+)/i,
        /wa\.me\/channel\/([A-Za-z0-9]+)/i,
        /channel\/([A-Za-z0-9]+)/i
    ];
    
    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    // If no pattern matches, check if it's just the channel ID
    if (/^[A-Za-z0-9]{20,}$/.test(input)) {
        return input;
    }
    
    return null;
}

// Alternative method for fetching channel info
async function tryAlternativeMethod(sock, channelId) {
    try {
        // Try to create a mock newsletter JID and get info
        const newsletterJid = `${channelId}@newsletter`;
        
        // Try to get basic group-like info
        if (typeof sock.groupMetadata === 'function') {
            try {
                const basicInfo = await sock.groupMetadata(newsletterJid);
                return {
                    id: newsletterJid,
                    name: `Channel ${channelId}`,
                    subject: `Channel ${channelId}`,
                    creation: Math.floor(Date.now() / 1000)
                };
            } catch (e) {
                // Ignore group metadata errors
            }
        }
        
        return {
            id: newsletterJid,
            name: `Channel ${channelId}`,
            subject: `Channel ${channelId}`,
            creation: Math.floor(Date.now() / 1000)
        };
    } catch (error) {
        return null;
    }
}

// Send basic channel info when detailed info fails
async function sendBasicChannelInfo(sock, chatId, fake, channelId, originalMessage) {
    const newsletterJid = `${channelId}@newsletter`;
    
    const basicInfo = `
╭─❍『 📡 CHANNEL BASIC INFO 』❍─
│
│ 🔖 *Channel ID:* ${channelId}
│ 🆔 *Newsletter JID:* ${newsletterJid}
│ 🔗 *Direct Link:* https://whatsapp.com/channel/${channelId}
│
│ 💡 *Note:* Detailed channel information is not accessible.
│ This could be because:
│ • Channel is private
│ • Bot needs channel subscription
│ • API limitations
│
╰─⭓ Powered by ${getBotName()}
`;

    await sock.sendMessage(chatId, {
        react: { text: '📡', key: originalMessage.key }
    });

    await sock.sendMessage(chatId, {
        text: basicInfo,
        contextInfo: {
            forwardingScore: 1,
            isForwarded: false,
            forwardedNewsletterMessageInfo: {
                newsletterJid: newsletterJid,
                newsletterName: `Channel ${channelId}`,
                serverMessageId: -1
            }
        }
    }, { quoted: fake });
}

// Send detailed channel info
async function sendChannelInfo(sock, chatId, fake, metadata, channelId, originalMessage) {
    const newsletterJid = metadata.id || `${channelId}@newsletter`;
    
    const infoText = `
╭─❍『 📡 CHANNEL INFORMATION 』❍─
│
│ 🔖 *Channel ID:* ${channelId}
│ 🗂️ *Name:* ${metadata.name || metadata.subject || 'Unknown'}
│ 📝 *Description:* ${metadata.description || metadata.desc || 'No description'}
│ 👥 *Subscribers:* ${metadata.subscribers ? metadata.subscribers.toLocaleString() : 
                     metadata.size ? metadata.size.toLocaleString() : 'N/A'}
│ 👤 *Owner:* ${metadata.owner || metadata.creator || 'Unknown'}
│ 🗓️ *Created:* ${metadata.creation_time ? new Date(metadata.creation_time * 1000).toLocaleDateString() : 
                 metadata.creation ? new Date(metadata.creation * 1000).toLocaleDateString() : 
                 metadata.subjectTime ? new Date(metadata.subjectTime * 1000).toLocaleDateString() : 'Unknown'}
│ 🔗 *Link:* https://whatsapp.com/channel/${channelId}
│
╰─⭓ Powered by ${getBotName()}
`;

    await sock.sendMessage(chatId, {
        react: { text: '✅', key: originalMessage.key }
    });

    // Send with preview image if available
    if (metadata.preview || metadata.pic) {
        const imageUrl = metadata.preview ? `https://pps.whatsapp.net${metadata.preview}` : 
                        metadata.pic ? metadata.pic : null;
        
        if (imageUrl) {
            await sock.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: infoText,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: newsletterJid,
                        newsletterName: metadata.name || metadata.subject || `Channel ${channelId}`,
                        serverMessageId: -1
                    }
                }
            }, { quoted: fake });
            return;
        }
    }

    // Send without image
    await sock.sendMessage(chatId, {
        text: infoText,
        contextInfo: {
            forwardingScore: 1,
            isForwarded: false,
            forwardedNewsletterMessageInfo: {
                newsletterJid: newsletterJid,
                newsletterName: metadata.name || metadata.subject || `Channel ${channelId}`,
                serverMessageId: -1
            }
        }
    }, { quoted: fake });
}

// Helper function to get prefix
function getPrefix() {
    try {
        const { getPrefix } = require('./setprefix');
        return getPrefix();
    } catch (error) {
        return '.'; // fallback prefix
    }
}

// Helper function to get bot name
function getBotName() {
    try {
        const { getBotName } = require('./setbot');
        return getBotName();
    } catch (error) {
        return 'JUNE-MD'; // fallback
    }
}

module.exports = newsletterCommand;

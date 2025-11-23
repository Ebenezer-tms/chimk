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
                text: `❎ *Please provide a WhatsApp Channel link.*\n\n📌 *Example:*\n${getPrefix()}newsletter https://whatsapp.com/channel/xxxxxxxxxx\n\nAliases: ${getPrefix()}cjid, ${getPrefix()}id`,
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

        const match = query.match(/whatsapp\.com\/channel\/([\w-]+)/i);
        if (!match) {
            return await sock.sendMessage(chatId, {
                text: `⚠️ *Invalid channel link!*\n\nMake sure it looks like:\nhttps://whatsapp.com/channel/xxxxxxxxx\n\nOr:\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A`,
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

        const inviteId = match[1];
        
        await sock.sendMessage(chatId, {
            text: '📡 Fetching channel info...',
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

        let metadata;
        try {
            // Use Baileys newsletterMetadata method
            metadata = await sock.newsletterMetadata("invite", inviteId);
        } catch (error) {
            console.error('Newsletter metadata error:', error);
            return await sock.sendMessage(chatId, {
                text: '🚫 *Failed to fetch channel info.*\n\nDouble-check the link and try again.\n\nPossible reasons:\n• Invalid channel link\n• Channel is private\n• Network issue',
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

        if (!metadata?.id) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Channel not found or inaccessible.*\n\nThe channel might be:\n• Private\n• Deleted\n• Not accessible in your region',
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

        // Format the channel info
        const infoText = `
╭─❍『 📡 CHANNEL INFO 』❍─
│
│ 🔖 *ID:* ${metadata.id}
│ 🗂️ *Name:* ${metadata.name || 'No Name'}
│ 📝 *Description:* ${metadata.description || 'No description'}
│ 👥 *Followers:* ${metadata.subscribers ? metadata.subscribers.toLocaleString() : "N/A"}
│ 🗓️ *Created:* ${metadata.creation_time ? new Date(metadata.creation_time * 1000).toLocaleDateString() : "Unknown"}
│ 🔗 *Link:* https://whatsapp.com/channel/${inviteId}
│
╰─⭓ Powered by ${getBotName()}
`;

        // Send reaction
        await sock.sendMessage(chatId, {
            react: { text: '📡', key: message.key }
        });

        // Send channel info with preview if available
        if (metadata.preview) {
            await sock.sendMessage(chatId, {
                image: { url: `https://pps.whatsapp.net${metadata.preview}` },
                caption: infoText,
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
        } else {
            await sock.sendMessage(chatId, {
                text: infoText,
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

    } catch (error) {
        console.error('❌ Newsletter command error:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: '⚠️ *An unexpected error occurred while fetching the channel info.*\n\nPlease try again later.',
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
        return 'pretty-MD'; // fallback
    }
}

module.exports = newsletterCommand;

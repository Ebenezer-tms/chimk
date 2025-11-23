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
                text: `📡 *Newsletter JID Extractor*\n\nUsage:\n• ${getPrefix()}newsletter <channel_link>\n• ${getPrefix()}cjid <channel_link>\n\nExample:\n${getPrefix()}newsletter https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A\n\nThis will extract the full Newsletter JID from the channel link.`,
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

        // Extract the invite code from the link
        const inviteCode = extractInviteCode(query);
        
        if (!inviteCode) {
            return await sock.sendMessage(chatId, {
                text: '❌ Invalid channel link format!\n\nPlease provide a valid WhatsApp channel link like:\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A',
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
            text: '📡 Converting channel link to Newsletter JID...',
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
            // Use Baileys to get the newsletter metadata
            const metadata = await sock.newsletterMetadata("invite", inviteCode);
            
            if (!metadata || !metadata.id) {
                throw new Error('Could not fetch newsletter metadata');
            }

            const newsletterJid = metadata.id;
            const newsletterName = metadata.name || 'Unknown Channel';

            const resultText = `
╭─❍『 📡 NEWSLETTER JID 』❍─
│
│ 🔗 *Original Link:*
│ ${query}
│
│ 🔖 *Channel Name:*
│ ${newsletterName}
│
│ 🆔 *Newsletter JID:*
│ \`\`\`${newsletterJid}\`\`\`
│
│ 📋 *Formatted:*
│ ${newsletterJid}
│
╰─⭓ ${getBotName()}
`;

            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });

            await sock.sendMessage(chatId, {
                text: resultText,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: newsletterJid,
                        newsletterName: newsletterName,
                        serverMessageId: -1
                    }
                }
            }, { quoted: fake });

            // Send additional copy-friendly version
            await sock.sendMessage(chatId, {
                text: `📋 *Easy Copy Version:*\n\`\`\`${newsletterJid}\`\`\``,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: newsletterJid,
                        newsletterName: newsletterName,
                        serverMessageId: -1
                    }
                }
            });

        } catch (error) {
            console.error('Newsletter metadata error:', error);
            
            // Fallback: Create newsletter JID from invite code
            const fallbackJid = await createNewsletterJidFromInvite(sock, inviteCode);
            
            if (fallbackJid) {
                await sendFallbackResult(sock, chatId, fake, query, inviteCode, fallbackJid, message);
            } else {
                throw new Error('Failed to convert channel link to Newsletter JID');
            }
        }

    } catch (error) {
        console.error('❌ Newsletter command error:', error);
        const fake = createFakeContact(message);
        
        await sock.sendMessage(chatId, {
            text: `❌ Failed to extract Newsletter JID.\n\nError: ${error.message}\n\nMake sure:\n• The channel link is valid\n• The channel is public\n• You're using the correct link format`,
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

// Extract invite code from various WhatsApp channel link formats
function extractInviteCode(input) {
    const patterns = [
        /whatsapp\.com\/channel\/([A-Za-z0-9]+)/i,
        /https:\/\/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i,
        /https:\/\/www\.whatsapp\.com\/channel\/([A-Za-z0-9]+)/i,
        /wa\.me\/channel\/([A-Za-z0-9]+)/i
    ];
    
    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    // If it's just the code (like "0029Va90zAnIHphOuO8Msp3A")
    if (/^[A-Za-z0-9]{20,}$/.test(input)) {
        return input;
    }
    
    return null;
}

// Alternative method to create newsletter JID
async function createNewsletterJidFromInvite(sock, inviteCode) {
    try {
        // Try to get the newsletter JID by attempting to resolve the invite
        // This is a fallback method when newsletterMetadata fails
        
        // In Baileys, newsletter JIDs typically follow the pattern:
        // <numeric_id>@newsletter
        // We can try to extract or generate this
        
        // Method 1: Try to use the invite code directly (if it's numeric)
        if (/^\d+$/.test(inviteCode)) {
            return `${inviteCode}@newsletter`;
        }
        
        // Method 2: Try to fetch from cache or existing newsletters
        if (sock.newsletters) {
            const newsletters = Object.values(sock.newsletters);
            const found = newsletters.find(n => n.invite === inviteCode);
            if (found) return found.id;
        }
        
        // Method 3: Generate a placeholder (last resort)
        return `unknown_${inviteCode}@newsletter`;
        
    } catch (error) {
        return null;
    }
}

// Send fallback result when primary method fails
async function sendFallbackResult(sock, chatId, fake, originalLink, inviteCode, newsletterJid, originalMessage) {
    const resultText = `
╭─❍『 📡 NEWSLETTER JID (FALLBACK) 』❍─
│
│ 🔗 *Original Link:*
│ ${originalLink}
│
│ 🔑 *Invite Code:*
│ ${inviteCode}
│
│ 🆔 *Estimated Newsletter JID:*
│ \`\`\`${newsletterJid}\`\`\`
│
│ ⚠️ *Note: This is an estimated JID.*
│ The actual JID might be different.
│
╰─⭓ ${getBotName()}
`;

    await sock.sendMessage(chatId, {
        react: { text: '⚠️', key: originalMessage.key }
    });

    await sock.sendMessage(chatId, {
        text: resultText,
        contextInfo: {
            forwardingScore: 1,
            isForwarded: false,
            forwardedNewsletterMessageInfo: {
                newsletterJid: newsletterJid,
                newsletterName: `Channel ${inviteCode}`,
                serverMessageId: -1
            }
        }
    }, { quoted: fake });

    await sock.sendMessage(chatId, {
        text: `📋 *Copy Version:*\n\`\`\`${newsletterJid}\`\`\``
    });
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

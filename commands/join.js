const settings = require('../settings');

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

// Extract invite code from various WhatsApp link formats
function extractInviteCode(link) {
    try {
        // Remove any extra spaces and trim
        const cleanLink = link.trim();
        
        // Try different patterns to extract invite code
        const patterns = [
            /chat\.whatsapp\.com\/([A-Za-z0-9]+)/,
            /whatsapp\.com\/(?:invite\/|chat\/)?([A-Za-z0-9]+)/,
            /https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9]+)/,
            /https:\/\/whatsapp\.com\/(?:invite\/|chat\/)?([A-Za-z0-9]+)/
        ];
        
        for (const pattern of patterns) {
            const match = cleanLink.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // If no pattern matches, try direct split
        if (cleanLink.includes('chat.whatsapp.com/')) {
            const parts = cleanLink.split('chat.whatsapp.com/');
            if (parts[1]) {
                // Remove any query parameters or fragments
                return parts[1].split('?')[0].split('#')[0];
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

// Validate WhatsApp invite link
function isValidWhatsAppLink(link) {
    if (!link) return false;
    
    const cleanLink = link.trim().toLowerCase();
    return (
        cleanLink.includes('whatsapp.com') && 
        (cleanLink.includes('/invite/') || cleanLink.includes('/chat/') || cleanLink.includes('chat.whatsapp.com'))
    );
}

async function joinCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        
        // Check if user is owner or sudo
        const { isSudo } = require('../lib/index');
        const isOwnerOrSudo = message.key.fromMe || await isSudo(senderId);
        
        if (!isOwnerOrSudo) {
            return await sock.sendMessage(chatId, {
                text: '❌ THIS IS AN OWNER COMMAND!',
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

        const args = userMessage.split(' ').slice(1);
        const groupLink = args.join(' ');

        if (!groupLink) {
            return await sock.sendMessage(chatId, {
                text: `👥 *Join Group Command*\n\nUsage:\n${getPrefix()}join <group_link>\n\nExamples:\n${getPrefix()}join https://chat.whatsapp.com/ABC123def456\n${getPrefix()}join https://whatsapp.com/invite/ABC123def456\n${getPrefix()}join chat.whatsapp.com/ABC123def456`,
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

        // Validate the invite link
        if (!isValidWhatsAppLink(groupLink)) {
            return await sock.sendMessage(chatId, {
                text: '❌ INVALID WHATSAPP GROUP LINK!\n\nValid formats:\n• https://chat.whatsapp.com/ABC123def456\n• https://whatsapp.com/invite/ABC123def456\n• chat.whatsapp.com/ABC123def456',
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
            text: '⏳ Processing invite link...',
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

        // Extract invite code
        const inviteCode = extractInviteCode(groupLink);
        
        if (!inviteCode) {
            return await sock.sendMessage(chatId, {
                text: '❌ Could not extract invite code from the link.\n\nPlease check the link format.',
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

        console.log('Extracted invite code:', inviteCode);

        try {
            // Join the group using Baileys method
            await sock.sendMessage(chatId, {
                text: `🔄 Attempting to join group with code: ${inviteCode}`,
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

            const groupJid = await sock.groupAcceptInvite(inviteCode);
            
            if (groupJid) {
                await sock.sendMessage(chatId, {
                    text: `✅ SUCCESSFULLY JOINED THE GROUP!\n\n📝 Group JID: ${groupJid}\n🔗 Original Link: ${groupLink}`,
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

                // Send a welcome message in the new group
                try {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                    await sock.sendMessage(groupJid, {
                        text: `👋 Hello everyone!\n\nI'm ${getBotName()}, a WhatsApp bot created by ${getOwnerName()}.\n\nUse ${getPrefix()}menu to see all my features! 🚀`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: false,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '',
                                newsletterName: '',
                                serverMessageId: -1
                            }
                        }
                    });
                } catch (welcomeError) {
                    console.log('Could not send welcome message:', welcomeError.message);
                }

            } else {
                throw new Error('Join attempt returned no group JID');
            }

        } catch (error) {
            console.error('Join group error:', error);
            
            let errorMessage = '🚫 FAILED TO JOIN THE GROUP\n\n';
            
            if (error.message.includes('bad-request')) {
                errorMessage += '• Invalid or expired invite link\n';
                errorMessage += '• Bot might be banned from the group\n';
                errorMessage += '• Group might not exist\n';
            } else if (error.message.includes('not-authorized')) {
                errorMessage += '• Bot is not authorized to join\n';
                errorMessage += '• Group might be private\n';
            } else if (error.message.includes('forbidden')) {
                errorMessage += '• Bot is banned from the group\n';
            } else if (error.message.includes('not-found')) {
                errorMessage += '• Group not found\n';
                errorMessage += '• Invite link is invalid\n';
            } else if (error.message.includes('invite-link-revoked')) {
                errorMessage += '• Invite link has been revoked\n';
            } else {
                errorMessage += `Error: ${error.message}\n`;
            }
            
            errorMessage += `\nExtracted Code: ${inviteCode}\nLink: ${groupLink}`;
            
            await sock.sendMessage(chatId, {
                text: errorMessage,
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
        console.error('Error in join command:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: `❌ Unexpected error: ${error.message}`,
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
        return 'JUNE-MD'; // fallback
    }
}

// Helper function to get owner name
function getOwnerName() {
    try {
        const { getOwnerName } = require('./setowner');
        return getOwnerName();
    } catch (error) {
        return 'Owner'; // fallback
    }
}

module.exports = joinCommand;

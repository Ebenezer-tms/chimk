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

// Check if string is a valid URL
function isUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
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
        const groupLink = args[0];

        if (!groupLink) {
            return await sock.sendMessage(chatId, {
                text: `👥 *Join Group Command*\n\nUsage:\n${getPrefix()}join <group_link>\n\nExample:\n${getPrefix()}join https://chat.whatsapp.com/ABC123def456\n\nNote: Only works with valid WhatsApp group invite links.`,
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
        if (!isUrl(groupLink) || !groupLink.includes('whatsapp.com')) {
            return await sock.sendMessage(chatId, {
                text: '❌ INVALID LINK!\n\nPlease provide a valid WhatsApp group invite link starting with:\nhttps://chat.whatsapp.com/',
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
            text: '⏳ Please wait...',
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
            // Extract invite code from the link
            const inviteCode = groupLink.split('https://chat.whatsapp.com/')[1];
            
            if (!inviteCode) {
                throw new Error('Could not extract invite code from link');
            }

            // Join the group using Baileys method
            const groupJid = await sock.groupAcceptInvite(inviteCode);
            
            if (groupJid) {
                await sock.sendMessage(chatId, {
                    text: `✅ SUCCESSFULLY JOINED THE GROUP!\n\n📝 Group JID: ${groupJid}`,
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
                    await sock.sendMessage(groupJid, {
                        text: `👋 Hello everyone!\n\nI'm ${getBotName()}, a WhatsApp bot.\n\nUse ${getPrefix()}menu to see all my features! 🚀`,
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
                throw new Error('No response from join attempt');
            }

        } catch (error) {
            console.error('Join group error:', error);
            
            let errorMessage = '🚫 FAILED TO JOIN THE GROUP. ';
            
            if (error.message.includes('expired')) {
                errorMessage += 'The invite link has expired.';
            } else if (error.message.includes('invalid')) {
                errorMessage += 'The invite link is invalid.';
            } else if (error.message.includes('full')) {
                errorMessage += 'The group is full.';
            } else if (error.message.includes('blocked')) {
                errorMessage += 'The bot is blocked from joining this group.';
            } else if (error.message.includes('participants')) {
                errorMessage += 'Cannot join as a participant.';
            } else {
                errorMessage += `${error.message}`;
            }
            
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
            text: 'An error occurred while processing the command.',
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

module.exports = joinCommand;

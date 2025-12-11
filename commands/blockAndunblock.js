async function blockAndUnblockCommand(sock, chatId, message, msg) {
    const args = message.trim().split(' ');
    const command = args[0].toLowerCase();

    // Helper: block/unblock a single JID
    async function handleBlockStatus(jid, action, context = '') {
        if (!jid.includes('@s.whatsapp.net')) return;

        await sock.updateBlockStatus(jid, action);
        const phoneNumber = jid.split('@')[0];
        await sock.sendMessage(chatId, {
            text: `✅ Successfully ${action}ed ${context}${phoneNumber}`
        });
    }

    // Helper: extract mentioned or replied JIDs
    function getTargetJids() {
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        if (!contextInfo) return [];

        if (contextInfo.mentionedJid?.length > 0) {
            return contextInfo.mentionedJid;
        }
        if (contextInfo.participant) {
            return [contextInfo.participant];
        }
        return [];
    }

    try {
        switch (command) {
            case '!block':
            case '!unblock': {
                const action = command === '!block' ? 'block' : 'unblock';
                const jids = getTargetJids();

                if (jids.length > 0) {
                    for (const jid of jids) {
                        await handleBlockStatus(jid, action, jids.length > 1 ? 'mentioned user ' : 'replied user ');
                    }
                    return;
                }

                if (args.length < 2) {
                    await sock.sendMessage(chatId, {
                        text: `Usage:\n• ${command} <phone_number>\n• ${command} (reply)\n• ${command} @mention\n\nExample: ${command} 1234567890`
                    });
                    return;
                }

                const phone = args[1].replace(/[^0-9]/g, '');
                const jid = `${phone}@s.whatsapp.net`;
                await handleBlockStatus(jid, action);
                break;
            }

            case '!blocklist': {
                const blockedContacts = await sock.fetchBlocklist();

                if (!blockedContacts || blockedContacts.length === 0) {
                    await sock.sendMessage(chatId, {
                        text: '📋 Blocklist is empty. No contacts are blocked.'
                    });
                    return;
                }

                const blocklistMessage = [
                    '📋 *BLOCKED CONTACTS*\n',
                    ...blockedContacts.map((jid, i) => `${i + 1}. ${jid.split('@')[0]}`),
                    `\nTotal blocked: ${blockedContacts.length}`
                ].join('\n');

                await sock.sendMessage(chatId, { text: blocklistMessage });
                break;
            }

            default: {
                const helpMessage = `*Block/Unblock Commands:*\n\n` +
                    `• !block <number> - Block by phone number\n` +
                    `• !block (reply) - Block replied user\n` +
                    `• !block @mention - Block mentioned user\n` +
                    `• !unblock <number> - Unblock by phone number\n` +
                    `• !unblock (reply) - Unblock replied user\n` +
                    `• !unblock @mention - Unblock mentioned user\n` +
                    `• !blocklist - View all blocked contacts\n\n` +
                    `*Examples:*\n` +
                    `- Reply to a message with "!block"\n` +
                    `- Mention someone: "!block @user"\n` +
                    `- Use phone: "!block 1234567890"`;

                await sock.sendMessage(chatId, { text: helpMessage });
            }
        }
    } catch (error) {
        console.error('Error in block/unblock command:', error);

        let errorMessage = '❌ An error occurred. ';
        if (error.message?.includes('not authorized')) {
            errorMessage += 'You are not authorized to perform this action.';
        } else if (error.message?.includes('not found')) {
            errorMessage += 'Contact not found.';
        } else if (error.message?.includes('bad request')) {
            errorMessage += 'Invalid contact format. Use a valid phone number or mention.';
        } else {
            errorMessage += error.message || 'Unknown error.';
        }

        await sock.sendMessage(chatId, { text: errorMessage });
    }
}

module.exports = blockAndUnblockCommand;

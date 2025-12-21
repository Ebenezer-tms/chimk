const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

async function saveStatusCommand(sock, chatId, message) {
    try {
        // 🔒 Owner-only
        if (!message.key.fromMe) {
            return sock.sendMessage(chatId, {
                text: '😡 Command only for the owner.'
            }, { quoted: message });
        }

        // 👤 Owner private chat JID
        const ownerJid =
            message.key.participant ||
            message.key.remoteJid.replace('@g.us', '@s.whatsapp.net');

        const quotedInfo = message.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = quotedInfo?.quotedMessage;

        if (!quotedMsg) {
            await sock.sendMessage(chatId, {
                text: '⚠️ Reply to a status update to save it.'
            }, { quoted: message });
            return;
        }

        // 📝 TEXT STATUS
        if (quotedMsg.extendedTextMessage?.text) {
            const text = quotedMsg.extendedTextMessage.text;

            await sock.sendMessage(ownerJid, {
                text: `📑 *Saved Status*\n\n${text}`
            });

            await sock.sendMessage(chatId, {
                text: '✅ Status saved to your private chat.'
            }, { quoted: message });

            return;
        }

        // 📷 MEDIA STATUS
        let mediaType, extension;
        if (quotedMsg.imageMessage) {
            mediaType = 'image';
            extension = 'jpg';
        } else if (quotedMsg.videoMessage) {
            mediaType = 'video';
            extension = 'mp4';
        } else if (quotedMsg.audioMessage) {
            mediaType = 'audio';
            extension = 'ogg';
        } else {
            return sock.sendMessage(chatId, {
                text: '❌ Unsupported status type.'
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        // 📥 Download media
        const buffer = await downloadMediaMessage(
            { message: quotedMsg },
            'buffer',
            {},
            { logger: sock.logger, reuploadRequest: sock.updateMediaMessage }
        );

        // 📂 Save locally (optional but kept)
        const dirPath = path.join(__dirname, '..', 'data', 'statuses');
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

        const filename = `status_${Date.now()}.${extension}`;
        fs.writeFileSync(path.join(dirPath, filename), buffer);

        // 📤 SEND TO PRIVATE CHAT
        await sock.sendMessage(ownerJid, {
            [mediaType]: buffer,
            caption: '📑 *Saved Status*'
        });

        await sock.sendMessage(chatId, {
            text: '✅ Status saved to your private chat.'
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('SAVE STATUS ERROR:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to save status.'
        }, { quoted: message });
    }
}

module.exports = saveStatusCommand;

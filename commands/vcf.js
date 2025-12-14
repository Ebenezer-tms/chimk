const fs = require('fs');
const path = require('path');

async function vcfCommand(sock, chatId, message) {
    try {
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];

        // Validate group size
        if (participants.length < 2) {
            return await sock.sendMessage(
                chatId,
                { text: "❌ Group must have at least 2 members" },
                { quoted: message }
            );
        }

        if (participants.length > 500) {
            return await sock.sendMessage(
                chatId,
                { text: "❌ Group is too large (max 500 members for VCF)" },
                { quoted: message }
            );
        }

        // Temp directory
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const vcfContacts = [];
        const failedContacts = [];

        for (const participant of participants) {
            try {
                const whatsappId = participant.id;
                const match = whatsappId.match(/^(\d+)@s\.whatsapp\.net$/);

                if (!match) {
                    failedContacts.push(whatsappId);
                    continue;
                }

                const phoneNumber = match[1];

                const displayName =
                    participant.notify ||
                    participant.name ||
                    participant.pushName ||
                    `User_${phoneNumber}`;

                const cleanName = displayName
                    .replace(/[^\p{L}\p{N}\s]/gu, '')
                    .trim() || `User_${phoneNumber}`;

                const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${cleanName}
TEL;TYPE=CELL,VOICE:+${phoneNumber}
NOTE:Exported from ${groupMetadata.subject || 'WhatsApp Group'}
REV:${new Date().toISOString()}
UID:${Date.now()}${Math.floor(Math.random() * 1000)}
END:VCARD
`;

                vcfContacts.push(vcard);

            } catch {
                failedContacts.push(participant.id);
            }
        }

        // No valid contacts
        if (vcfContacts.length === 0) {
            return await sock.sendMessage(
                chatId,
                { text: "❌ No valid phone numbers found in group members." },
                { quoted: message }
            );
        }

        // Build VCF file
        const vcfContent = vcfContacts.join('');

        const sanitizedGroupName = (groupMetadata.subject || 'WhatsAppGroup')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);

        const vcfPath = path.join(
            tempDir,
            `${sanitizedGroupName}_${Date.now()}.vcf`
        );

        fs.writeFileSync(vcfPath, vcfContent, 'utf8');

        // Send file
        await sock.sendMessage(
            chatId,
            {
                document: fs.readFileSync(vcfPath),
                mimetype: 'text/vcard',
                fileName: `${sanitizedGroupName}_contacts.vcf`,
                caption:
`📇 *Group Contacts Export*

• Group: ${groupMetadata.subject || 'Unknown'}
• Total Members: ${participants.length}
• Exported: ${vcfContacts.length}
• Failed: ${failedContacts.length}
• Generated: ${new Date().toLocaleString()}

_File will be deleted automatically_`
            },
            { quoted: message }
        );

        // Warn about failures
        if (failedContacts.length > 0) {
            await sock.sendMessage(chatId, {
                text: `⚠️ ${failedContacts.length} contacts could not be exported due to invalid WhatsApp IDs.`
            });
        }

        // Cleanup after 60 seconds
        setTimeout(() => {
            try {
                if (fs.existsSync(vcfPath)) {
                    fs.unlinkSync(vcfPath);
                }
            } catch (err) {
                console.error('VCF cleanup error:', err);
            }
        }, 60000);

    } catch (error) {
        console.error('VCF Command Error:', error);

        let errorMessage = "❌ Failed to generate VCF file.";

        if (
            error.message?.includes('not authorized') ||
            error.message?.includes('401')
        ) {
            errorMessage = "❌ Bot must be admin to read group members.";
        }

        await sock.sendMessage(
            chatId,
            { text: `${errorMessage}\n\nError: ${error.message}` },
            { quoted: message }
        );
    }
}

module.exports = vcfCommand;

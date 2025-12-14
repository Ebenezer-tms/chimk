const fs = require('fs');
const path = require('path');

async function vcfCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command only works in groups!'
            }, { quoted: message });
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];

        let vcfContent = '';
        let count = 0;

        for (const p of participants) {
            if (!p.id) continue;

            // 🔥 IMPORTANT FILTER
            // Accept ONLY numbers@s.whatsapp.net
            if (!p.id.endsWith('@s.whatsapp.net')) continue;

            const number = p.id.replace('@s.whatsapp.net', '');

            // Extra safety check
            if (!/^\d{8,15}$/.test(number)) continue;

            const name =
                p.notify ||
                p.name ||
                `Member ${count + 1}`;

            vcfContent +=
`BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;TYPE=CELL:+${number}
NOTE:From ${groupMetadata.subject}
END:VCARD

`;
            count++;
        }

        if (count === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No valid phone numbers found in this group!'
            }, { quoted: message });
        }

        // Temp folder
        const tmpDir = path.join(__dirname, '../tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

        const safeName = groupMetadata.subject.replace(/[^\w]/g, '_');
        const filePath = path.join(tmpDir, `${safeName}_${Date.now()}.vcf`);

        fs.writeFileSync(filePath, vcfContent);

        await sock.sendMessage(chatId, {
            document: fs.readFileSync(filePath),
            mimetype: 'text/vcard',
            fileName: `${safeName}_contacts.vcf`,
            caption:
`📇 *VCF Export Successful*

• Group: ${groupMetadata.subject}
• Contacts: ${count}
• Generated: ${new Date().toLocaleString()}`
        }, { quoted: message });

        fs.unlinkSync(filePath);

    } catch (err) {
        console.error('VCF ERROR:', err);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to generate VCF file!'
        }, { quoted: message });
    }
}

module.exports = vcfCommand;

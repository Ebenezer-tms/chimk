const fs = require('fs');
const path = require('path');

async function vcfCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command only works in groups!'
            }, { quoted: message });
        }

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];

        let vcf = '';
        let total = 0;

        for (const p of participants) {
            // ✅ Support ALL Baileys formats
            const jid = p.id || p.jid;
            if (!jid) continue;

            // Must be WhatsApp user
            if (!jid.includes('@s.whatsapp.net')) continue;

            // Remove device part ( :23 )
            let number = jid.split('@')[0];
            number = number.split(':')[0];

            // Digits only
            number = number.replace(/\D/g, '');

            // Final validation
            if (number.length < 8 || number.length > 15) continue;

            const name =
                p.notify ||
                p.name ||
                `Member ${total + 1}`;

            vcf +=
`BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;TYPE=CELL:+${number}
NOTE:From ${metadata.subject}
END:VCARD

`;
            total++;
        }

        if (total === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No valid phone numbers found.\n\nMake sure this is a REAL WhatsApp group.'
            }, { quoted: message });
        }

        const tmp = path.join(__dirname, '../tmp');
        if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);

        const safeName = metadata.subject.replace(/[^\w]/g, '_');
        const file = path.join(tmp, `${safeName}_${Date.now()}.vcf`);

        fs.writeFileSync(file, vcf);

        await sock.sendMessage(chatId, {
            document: fs.readFileSync(file),
            mimetype: 'text/vcard',
            fileName: `${safeName}_contacts.vcf`,
            caption:
`📇 *VCF Export Successful*

• Group: ${metadata.subject}
• Contacts: ${total}
• Generated: ${new Date().toLocaleString()}`
        }, { quoted: message });

        fs.unlinkSync(file);

    } catch (e) {
        console.error('VCF ERROR:', e);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to generate VCF'
        }, { quoted: message });
    }
}

module.exports = vcfCommand;

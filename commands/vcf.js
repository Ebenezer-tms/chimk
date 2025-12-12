const fs = require('fs');
const path = require('path');

async function vcfCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { text: '❌ Groups only!' }, { quoted: message });
        }

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;
        
        let vcf = '';
        let count = 0;
        
        for (const participant of participants) {
            const number = participant.id.split('@')[0];
            const name = participant.notify || `User${number}`;
            
            vcf += `BEGIN:VCARD
VERSION:3.0
FN:🔥 ${name}
TEL:${number}
END:VCARD

`;
            count++;
        }
        
        if (count === 0) {
            return await sock.sendMessage(chatId, { text: 'No contacts found.' }, { quoted: message });
        }
        
        const fileName = `group_contacts_${Date.now()}.vcf`;
        const filePath = path.join(__dirname, '../temp', fileName);
        
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        fs.writeFileSync(filePath, vcf);
        
        await sock.sendMessage(chatId, {
            document: fs.readFileSync(filePath),
            fileName: fileName,
            mimetype: 'text/vcard',
            caption: `🔥 ${count} contacts exported\nAll names start with 🔥`
        }, { quoted: message });
        
        // Cleanup
        setTimeout(() => {
            try { fs.unlinkSync(filePath); } catch(e) {}
        }, 5000);
        
    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, { text: 'Error creating VCF' }, { quoted: message });
    }
}

module.exports = vcfCommand;

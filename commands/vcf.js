const fs = require('fs');
const path = require('path');

async function vcfCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ This command only works in groups!' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { 
            text: '📞 Extracting phone numbers...' 
        }, { quoted: message });

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;
        
        let vcfContent = '';
        let exportedCount = 0;
        
        // WhatsApp JID format: 263771234567@s.whatsapp.net
        // We want: +263771234567
        
        for (const participant of participants) {
            const jid = participant.id;
            
            // Extract numbers from JID (removes @s.whatsapp.net)
            const phoneMatch = jid.match(/^(\d+)@s\.whatsapp\.net$/);
            
            if (phoneMatch) {
                const rawNumber = phoneMatch[1];
                
                // Only process if it looks like a phone number (7-15 digits)
                if (rawNumber.length >= 7 && rawNumber.length <= 15) {
                    const formattedNumber = `+${rawNumber}`;
                    const displayName = participant.notify || formattedNumber;
                    
                    // Create VCF entry with fire emoji
                    vcfContent += `BEGIN:VCARD
VERSION:3.0
FN:🔥 ${displayName}
TEL;TYPE=CELL:${formattedNumber}
END:VCARD

`;
                    exportedCount++;
                }
            }
        }
        
        if (exportedCount === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No phone numbers found in group members.'
            }, { quoted: message });
        }
        
        // Save to file
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const fileName = `phone_contacts_${Date.now()}.vcf`;
        const filePath = path.join(tempDir, fileName);
        
        fs.writeFileSync(filePath, vcfContent);
        
        // Get sample numbers for preview
        const sampleNumbers = [];
        const lines = vcfContent.split('\n');
        for (const line of lines) {
            if (line.startsWith('TEL;TYPE=CELL:')) {
                const phone = line.replace('TEL;TYPE=CELL:', '').trim();
                sampleNumbers.push(phone);
                if (sampleNumbers.length >= 3) break;
            }
        }
        
        // Send file
        await sock.sendMessage(chatId, {
            document: fs.readFileSync(filePath),
            fileName: fileName,
            mimetype: 'text/vcard',
            caption: `✅ *PHONE CONTACTS*\n\n` +
                     `📊 Total: ${exportedCount} numbers\n` +
                     `📱 Format: +[Country Code][Number]\n` +
                     `🔥 Names: All start with 🔥\n\n` +
                     `📞 Examples:\n` +
                     `${sampleNumbers.map(num => `• ${num}`).join('\n')}\n\n` +
                     `💾 Save and import to contacts`
        }, { quoted: message });
        
        // Cleanup
        setTimeout(() => {
            try { fs.unlinkSync(filePath); } catch(e) {}
        }, 10000);
        
    } catch (error) {
        console.error('VCF error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error creating contacts file' 
        }, { quoted: message });
    }
}

module.exports = vcfCommand;

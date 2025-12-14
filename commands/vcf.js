const fs = require('fs');
const path = require('path');

async function vcfCommand(sock, chatId, message) {
    try {
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];
        
        // Validate group size
        if (participants.length < 2) {
            await sock.sendMessage(chatId, {
                text: "❌ Group must have at least 2 members"
            }, { quoted: message });
            return;
        }

        // Create temp directory
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        let vcfContent = '';
        let contactCount = 0;
        
        // Process each participant
        for (const participant of participants) {
            try {
                const jid = participant.id;
                
                // Get contact info using WhatsApp's API
                const contact = await sock.getContact(jid);
                
                // Extract phone number if available
                let phoneNumber = '';
                let displayName = 'Unknown';
                
                // Try to get name
                if (contact.notify) {
                    displayName = contact.notify;
                } else if (contact.name) {
                    displayName = contact.name;
                } else if (contact.vname) {
                    displayName = contact.vname;
                }
                
                // Clean the WhatsApp ID to get a number-like string
                // This extracts the numeric part before @
                const idMatch = jid.match(/^(\d+)@/);
                if (idMatch && idMatch[1]) {
                    phoneNumber = idMatch[1];
                    
                    // Format as international number
                    // WhatsApp IDs often have country code included
                    // For example: 919876543210@s.whatsapp.net -> +91 9876543210
                    let formattedNumber = phoneNumber;
                    
                    // Add country code formatting if needed
                    if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
                        // India: remove 91 and format as +91 9876543210
                        formattedNumber = `+91 ${phoneNumber.substring(2)}`;
                    } else if (phoneNumber.startsWith('1') && phoneNumber.length === 11) {
                        // US/Canada: format as +1 XXX XXX XXXX
                        formattedNumber = `+1 ${phoneNumber.substring(1, 4)} ${phoneNumber.substring(4, 7)} ${phoneNumber.substring(7)}`;
                    } else {
                        // Default format
                        formattedNumber = `+${phoneNumber}`;
                    }
                    
                    // Create VCF entry
                    vcfContent += `BEGIN:VCARD
VERSION:3.0
FN:${displayName}
TEL;TYPE=CELL:${formattedNumber}
NOTE:WhatsApp Contact
END:VCARD

`;
                    
                    contactCount++;
                }
            } catch (error) {
                console.log(`Skipping participant ${participant.id}:`, error.message);
                continue;
            }
        }

        if (contactCount === 0) {
            await sock.sendMessage(chatId, {
                text: "❌ Could not extract contact information"
            }, { quoted: message });
            return;
        }

        // Create VCF file
        const sanitizedGroupName = (groupMetadata.subject || 'WhatsAppGroup')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);
            
        const timestamp = Date.now();
        const vcfPath = path.join(tempDir, `contacts_${timestamp}.vcf`);
        
        fs.writeFileSync(vcfPath, vcfContent, 'utf8');

        // Send the file
        await sock.sendMessage(chatId, {
            document: fs.readFileSync(vcfPath),
            fileName: `${sanitizedGroupName}_contacts.vcf`,
            mimetype: 'text/vcard',
            caption: `📇 *WhatsApp Contacts*\n\n` +
                     `• Group: ${groupMetadata.subject || 'Unknown'}\n` +
                     `• Contacts: ${contactCount}/${participants.length}\n` +
                     `• Note: WhatsApp IDs may not be real phone numbers\n` +
                     `• Generated: ${new Date().toLocaleString()}`
        }, { quoted: message });

        // Clean up
        setTimeout(() => {
            if (fs.existsSync(vcfPath)) {
                fs.unlinkSync(vcfPath);
            }
        }, 30000);

    } catch (error) {
        console.error('VCF Command Error:', error);
        await sock.sendMessage(chatId, {
            text: "❌ Error: " + error.message
        }, { quoted: message });
    }
}

module.exports = vcfCommand;

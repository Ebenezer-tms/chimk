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

        // Generate VCF content
        let vcfContent = '';
        let contactCount = 0;
        
        participants.forEach(participant => {
            // Extract phone number from WhatsApp ID
            // Format: 919876543210@s.whatsapp.net -> 9876543210
            const whatsappId = participant.id;
            const phoneMatch = whatsappId.match(/^(\d+)@/);
            
            if (phoneMatch && phoneMatch[1]) {
                let phoneNumber = phoneMatch[1];
                
                // Remove country code if it's too long (assuming 10-digit Indian numbers)
                // This handles numbers like 919876543210 -> 9876543210
                if (phoneNumber.length > 10) {
                    // Remove leading country codes
                    if (phoneNumber.startsWith('91')) { // India
                        phoneNumber = phoneNumber.substring(2);
                    } else if (phoneNumber.startsWith('1')) { // US/Canada
                        phoneNumber = phoneNumber.substring(1);
                    } else if (phoneNumber.startsWith('44')) { // UK
                        phoneNumber = phoneNumber.substring(2);
                    }
                    // Add more country codes as needed
                }
                
                // Validate it's a proper phone number (8-15 digits)
                if (/^\d{8,15}$/.test(phoneNumber)) {
                    // Get display name
                    const displayName = participant.name || 
                                       participant.notify || 
                                       participant.pushName || 
                                       `User_${phoneNumber}`;
                    
                    // Clean the display name for VCF
                    const cleanName = displayName.replace(/[^\p{L}\p{N}\s-]/gu, '').trim();
                    
                    // Create VCF entry
                    vcfContent += `BEGIN:VCARD
VERSION:3.0
FN:${cleanName}
N:;${cleanName};;;
TEL;TYPE=CELL:+${phoneNumber}
TEL;TYPE=VOICE:+${phoneNumber}
NOTE:Imported from WhatsApp group - ${groupMetadata.subject || 'Group'}
REV:${new Date().toISOString()}
UID:${Date.now()}_${Math.random().toString(36).substr(2, 9)}
END:VCARD\n\n`;
                    
                    contactCount++;
                }
            }
        });

        if (contactCount === 0) {
            await sock.sendMessage(chatId, { 
                text: "❌ No valid phone numbers found in group members." 
            }, { quoted: message });
            return;
        }

        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Create filename
        const sanitizedGroupName = (groupMetadata.subject || 'WhatsAppGroup')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);
            
        const timestamp = Date.now();
        const vcfPath = path.join(tempDir, `contacts_${timestamp}.vcf`);
        
        // Write VCF file
        fs.writeFileSync(vcfPath, vcfContent, 'utf8');
        
        // Read file for sending
        const fileBuffer = fs.readFileSync(vcfPath);
        const fileName = `${sanitizedGroupName}_contacts.vcf`;
        
        // Send the VCF file
        await sock.sendMessage(chatId, {
            document: fileBuffer,
            fileName: fileName,
            mimetype: 'text/vcard',
            caption: `📇 *Phone Contacts Exported*\n\n` +
                     `📱 Contacts: ${contactCount} numbers\n` +
                     `👥 Group: ${groupMetadata.subject || 'Unknown'}\n` +
                     `📅 Exported: ${new Date().toLocaleString()}\n\n` +
                     `_Save this file and import to your phone contacts_`
        }, { quoted: message });

        // Clean up after 30 seconds
        setTimeout(() => {
            try {
                if (fs.existsSync(vcfPath)) {
                    fs.unlinkSync(vcfPath);
                }
            } catch (e) {
                console.log('Error deleting VCF file:', e);
            }
        }, 30000);

    } catch (error) {
        console.error('VCF Error:', error);
        await sock.sendMessage(chatId, { 
            text: "❌ Error generating VCF: " + error.message 
        }, { quoted: message });
    }
}

module.exports = vcfCommand;

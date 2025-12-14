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
        
        if (participants.length > 1000) {
            await sock.sendMessage(chatId, {
                text: "❌ Group is too large (max 1000 members)"
            }, { quoted: message });
            return;
        }

        // Generate VCF content
        let vcfContent = '';
        participants.forEach(participant => {
            // Extract phone number from WhatsApp ID (format: 1234567890@s.whatsapp.net)
            const phoneNumber = participant.id.split('@')[0];
            
            // Get display name (use notify, name, or default)
            const displayName = participant.notify || 
                              participant.name || 
                              participant.pushName || 
                              `User_${phoneNumber}`;
            
            // Clean the display name
            const cleanName = displayName.replace(/[^\p{L}\p{N}\s]/gu, '').trim() || `User_${phoneNumber}`;
            
            // Create VCF entry - THIS IS THE CORRECT VCF FORMAT
            vcfContent += `BEGIN:VCARD
VERSION:3.0
FN:${cleanName}
TEL;TYPE=CELL:+${phoneNumber}
NOTE:From ${groupMetadata.subject || 'WhatsApp Group'}
END:VCARD

`;
        });

        // Create temp file
        const sanitizedGroupName = (groupMetadata.subject || 'WhatsAppGroup').replace(/[^\w]/g, '_');
        const tempDir = path.join(__dirname, '../temp');
        
        // Create temp directory if it doesn't exist
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const vcfPath = path.join(tempDir, `${sanitizedGroupName}_${Date.now()}.vcf`);
        fs.writeFileSync(vcfPath, vcfContent, 'utf8');

        // Send VCF file using proper file sending method for your bot
        // Method 1: Using file path (works for some bot structures)
        await sock.sendMessage(chatId, {
            document: fs.readFileSync(vcfPath),
            mimetype: 'text/vcard',
            fileName: `${sanitizedGroupName}_contacts.vcf`,
            caption: `📇 *Group Contacts*\n\n` +
                     `• Group: ${groupMetadata.subject || 'Unknown Group'}\n` +
                     `• Members: ${participants.length}\n` +
                     `• Generated: ${new Date().toLocaleString()}`
        }, { quoted: message });

        // Alternative method if above doesn't work:
        /*
        // Method 2: Using buffer directly
        const fileBuffer = fs.readFileSync(vcfPath);
        await sock.sendMessage(chatId, {
            document: fileBuffer,
            fileName: `${sanitizedGroupName}_contacts.vcf`,
            mimetype: 'text/vcard',
            caption: `📇 *Group Contacts*\n\n• Group: ${groupMetadata.subject}\n• Members: ${participants.length}`
        }, { quoted: message });
        */

        // Cleanup after a delay to ensure file is sent
        setTimeout(() => {
            try {
                if (fs.existsSync(vcfPath)) {
                    fs.unlinkSync(vcfPath);
                    console.log(`Cleaned up VCF file: ${vcfPath}`);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up VCF file:', cleanupError);
            }
        }, 5000); // Wait 5 seconds before cleanup

    } catch (error) {
        console.error('VCF Error:', error);
        await sock.sendMessage(chatId, {
            text: "❌ Failed to generate VCF file: " + error.message
        }, { quoted: message });
    }
}

module.exports = vcfCommand;

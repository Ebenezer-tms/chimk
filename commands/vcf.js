const fs = require('fs');
const path = require('path');

async function vcfCommand(sock, chatId, message) {
    try {
        // Check if it's a group
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command only works in groups!'
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            text: '📇 Creating VCF contacts file...'
        }, { quoted: message });

        // Get group metadata
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;
        const groupName = metadata.subject || 'WhatsApp Group';
        
        // Validate group size
        if (participants.length < 2) {
            return await sock.sendMessage(chatId, {
                text: '❌ Group must have at least 2 members'
            }, { quoted: message });
        }

        if (participants.length > 1000) {
            return await sock.sendMessage(chatId, {
                text: '❌ Group is too large (max 1000 members)'
            }, { quoted: message });
        }

        // Generate VCF content
        let vcfContent = '';
        let contactCount = 0;
        
        participants.forEach(participant => {
            try {
                // Extract phone number from JID
                const phoneNumber = participant.id.split('@')[0];
                
                // Validate phone number format (7-15 digits)
                if (phoneNumber && phoneNumber.length >= 7 && phoneNumber.length <= 15) {
                    const displayName = participant.notify || `User ${phoneNumber}`;
                    const formattedPhone = `+${phoneNumber}`;
                    
                    vcfContent += `BEGIN:VCARD
VERSION:3.0
FN:🔥 ${displayName}
TEL;TYPE=CELL:${formattedPhone}
NOTE:From ${groupName}
END:VCARD

`;
                    contactCount++;
                }
            } catch (error) {
                // Skip invalid entries
            }
        });

        if (contactCount === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ Could not extract any valid phone numbers'
            }, { quoted: message });
        }

        // Create temp directory
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Create filename
        const sanitizedGroupName = groupName.replace(/[^\w\s]/gi, '').trim() || 'Group';
        const fileName = `${sanitizedGroupName}_${contactCount}_contacts.vcf`;
        const filePath = path.join(tempDir, fileName);

        // Write VCF file
        fs.writeFileSync(filePath, vcfContent, 'utf8');

        // Get file size
        const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);

        // Send the file
        await sock.sendMessage(chatId, {
            document: fs.readFileSync(filePath),
            fileName: fileName,
            mimetype: 'text/vcard',
            caption: `📇 *GROUP CONTACTS VCF*\n\n` +
                     `👥 Group: ${groupName}\n` +
                     `📞 Contacts: ${contactCount}\n` +
                     `📁 Size: ${fileSize} KB\n` +
                     `🔥 Names: All start with 🔥\n` +
                     `📱 Numbers: International format (with +)\n\n` +
                     `💡 *How to import:*\n` +
                     `1. Save this .vcf file\n` +
                     `2. Open Contacts app\n` +
                     `3. Find import option\n` +
                     `4. Select this file`
        }, { quoted: message });

        // Clean up after 10 seconds
        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (error) {
                // Ignore cleanup errors
            }
        }, 10000);

    } catch (error) {
        console.error('VCF command error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to create VCF file. Please try again.'
        }, { quoted: message });
    }
}

module.exports = vcfCommand;

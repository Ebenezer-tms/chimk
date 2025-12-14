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
        
        if (participants.length > 500) {
            await sock.sendMessage(chatId, { 
                text: "❌ Group is too large (max 500 members for VCF)" 
            }, { quoted: message });
            return;
        }

        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Try to get participant details with error handling
        const vcfContacts = [];
        const failedContacts = [];
        
        for (const participant of participants) {
            try {
                // Extract phone number from WhatsApp ID
                // Format: 1234567890@s.whatsapp.net
                const whatsappId = participant.id;
                const phoneMatch = whatsappId.match(/^(\d+)@s\.whatsapp\.net$/);
                
                if (phoneMatch && phoneMatch[1]) {
                    const phoneNumber = phoneMatch[1];
                    const displayName = participant.notify || participant.name || `User_${phoneNumber}`;
                    const vcardId = Date.now() + Math.floor(Math.random() * 1000);
                    
                    // Create proper VCF entry
                    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${displayName}
TEL;TYPE=CELL,VOICE:${phoneNumber}
NOTE:Exported from ${groupMetadata.subject || 'WhatsApp Group'} via Xhypher Bot
REV:${new Date().toISOString()}
UID:${vcardId}
END:VCARD\n`;
                    
                    vcfContacts.push({
                        phoneNumber: phoneNumber,
                        displayName: displayName,
                        vcard: vcard
                    });
                } else {
                    failedContacts.push(participant.id);
                }
            } catch (err) {
                failedContacts.push(participant.id);
            }
        }

        // Check if we have any valid contacts
        if (vcfContacts.length === 0) {
            await sock.sendMessage(chatId, { 
                text: "❌ No valid phone numbers found in group members." 
            }, { quoted: message });
            return;
        }

        // Generate VCF content
        let vcfContent = '';
        vcfContacts.forEach(contact => {
            vcfContent += contact.vcard;
        });

        // Create file
        const sanitizedGroupName = (groupMetadata.subject || 'WhatsAppGroup')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);
            
        const timestamp = Date.now();
        const vcfPath = path.join(tempDir, `${sanitizedGroupName}_${timestamp}.vcf`);
        
        fs.writeFileSync(vcfPath, vcfContent, 'utf8');

        // Send VCF file
        const fileBuffer = fs.readFileSync(vcfPath);
        const fileName = `${sanitizedGroupName}_contacts.vcf`;
        
        await sock.sendMessage(chatId, {
            document: fileBuffer,
            fileName: fileName,
            mimetype: 'text/vcard',
            caption: `📇 *Group Contacts Export*\n\n` +
                     `• Group: ${groupMetadata.subject || 'Unknown Group'}\n` +
                     `• Total Members: ${participants.length}\n` +
                     `• Exported: ${vcfContacts.length} contacts\n` +
                     `• Failed: ${failedContacts.length}\n` +
                     `• Generated: ${new Date().toLocaleString()}\n\n` +
                     `_File will be deleted after download_`
        }, { quoted: message });

        // Send additional info if there were failures
        if (failedContacts.length > 0) {
            await sock.sendMessage(chatId, {
                text: `⚠️ Note: ${failedContacts.length} contacts could not be exported due to invalid WhatsApp IDs.`
            });
        }

        // Cleanup after 60 seconds
        setTimeout(() => {
            try {
                if (fs.existsSync(vcfPath)) {
                    fs.unlinkSync(vcfPath);
                    console.log(`Cleaned up VCF file: ${vcfPath}`);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up VCF file:', cleanupError);
            }
        }, 60000);

    } catch (error) {
        console.error('VCF Command Error:', error);
        
        let errorMessage = "❌ Failed to generate VCF file.";
        if (error.message.includes('not authorized') || error.message.includes('401')) {
            errorMessage = "❌ Bot is not authorized to access group metadata. Make sure bot is admin.";
        } else if (error.message.includes('404')) {
            errorMessage = "❌ Group not found or bot is not in the group.";
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage + "\nError: " + error.message 
        }, { quoted: message });
    }
}

module.exports = vcfCommand;

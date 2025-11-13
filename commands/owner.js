const { getOwnerName } = require('./setowner');
const { getOwnerNumber } = require('./setownernumber');
const settings = require('../settings');

async function ownerCommand(sock, chatId, message) {
    try {
        // Get dynamic owner name and number
        const ownerName = getOwnerName();
        const ownerNumber = getOwnerNumber();
        const cleanNumber = ownerNumber.split('@')[0];

        // Create clean vCard with only essential information
        const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
N:${ownerName};;;
ORG:PRETTY-MD Bot Owner;
TITLE:Bot Owner
TEL;TYPE=CELL,VOICE;waid=${cleanNumber}:${cleanNumber}
NOTE:PRETTY-MD WhatsApp Bot Owner
X-ABLABEL:Bot Owner
END:VCARD
`.trim();

        // Create fake contact for enhanced replies
        function createFakeContact(message) {
            return {
                key: {
                    participants: "0@s.whatsapp.net",
                    remoteJid: "status@broadcast",
                    fromMe: false,
                    id: "PRETTY-MD"
                },
                message: {
                    contactMessage: {
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:PRETTY MD\nitem1.TEL;waid=${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}:${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                    }
                },
                participant: "0@s.whatsapp.net"
            };
        }

        const fake = message ? createFakeContact(message) : null;

        //

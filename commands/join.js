const settings = require('../settings');

function createFakeContact(message) {
    return {
        key: {
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "JUNE-MD-MENU"
        },
        message: {
            contactMessage: {
                vcard:
                `BEGIN:VCARD
VERSION:3.0
N:Bot;;;;
FN:JUNE MD
item1.TEL;waid=${message.key.participant?.split("@")[0] || message.key.remoteJid.split("@")[0]}:${message.key.participant?.split("@")[0] || message.key.remoteJid.split("@")[0]}
item1.X-ABLabel:Ponsel
END:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

// ---------------------------------------------------------------------
// ⭐ FIXED: 100% CORRECT INVITE CODE EXTRACTION
// ---------------------------------------------------------------------
function extractInviteCode(link) {
    try {
        // remove spaces
        link = link.trim();

        // FIX: strip protocol
        link = link.replace("https://", "").replace("http://", "");

        if (link.includes("chat.whatsapp.com/")) {
            return link.split("chat.whatsapp.com/")[1].split("?")[0].split("#")[0];
        }

        if (link.includes("whatsapp.com/invite/")) {
            return link.split("whatsapp.com/invite/")[1].split("?")[0].split("#")[0];
        }

        // final fallback
        const possible = link.match(/([A-Za-z0-9]{15,24})/);
        return possible ? possible[1] : null;

    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------

function isValidWhatsAppLink(link) {
    if (!link) return false;
    link = link.toLowerCase();
    return (
        link.includes("chat.whatsapp.com/") ||
        link.includes("whatsapp.com/invite/")
    );
}

async function joinCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);

        const { isSudo } = require('../lib/index');
        const isOwnerOrSudo = message.key.fromMe || await isSudo(senderId);

        if (!isOwnerOrSudo) {
            return sock.sendMessage(chatId, {
                text: "❌ THIS IS AN OWNER COMMAND!",
            }, { quoted: fake });
        }

        const args = userMessage.split(" ").slice(1);
        const groupLink = args.join(" ").trim();

        if (!groupLink) {
            return sock.sendMessage(chatId, {
                text: `Usage:\n${getPrefix()}join <group_link>`
            }, { quoted: fake });
        }

        if (!isValidWhatsAppLink(groupLink)) {
            return sock.sendMessage(chatId, {
                text: "❌ INVALID GROUP LINK!"
            }, { quoted: fake });
        }

        // extract fixed invite code
        const inviteCode = extractInviteCode(groupLink);

        if (!inviteCode) {
            return sock.sendMessage(chatId, {
                text: "❌ Could not extract invite code."
            }, { quoted: fake });
        }

        await sock.sendMessage(chatId, {
            text: `⏳ Joining group...\nInvite Code: *${inviteCode}*`
        }, { quoted: fake });

        // ---------------------------------------------------------------------
        // ⭐ REAL JOIN ATTEMPT
        // ---------------------------------------------------------------------
        let groupJid;
        try {
            groupJid = await sock.groupAcceptInvite(inviteCode);
        } catch (err) {
            console.log("Join error:", err);

            return sock.sendMessage(chatId, {
                text: `❌ FAILED TO JOIN\nReason: ${err?.message || err}`
            }, { quoted: fake });
        }

        if (!groupJid) {
            return sock.sendMessage(chatId, {
                text: "❌ Failed: No group JID returned."
            }, { quoted: fake });
        }

        // ---------------------------------------------------------------------

        await sock.sendMessage(chatId, {
            text: `✅ JOINED GROUP!\n\nGroup JID: ${groupJid}`
        }, { quoted: fake });

        // Welcome message
        try {
            setTimeout(() => {
                sock.sendMessage(groupJid, {
                    text: `👋 Hello!\nI'm ${getBotName()}.\nUse *${getPrefix()}menu*`
                });
            }, 1500);
        } catch {}

    } catch (err) {
        console.log("JOIN CMD ERROR:", err);
        const fake = createFakeContact(message);
        return sock.sendMessage(chatId, {
            text: `❌ Unexpected error: ${err.message}`
        }, { quoted: fake });
    }
}

function getPrefix() {
    try { return require('./setprefix').getPrefix(); }
    catch { return "."; }
}
function getBotName() {
    try { return require('./setbot').getBotName(); }
    catch { return "JUNE-MD"; }
}
function getOwnerName() {
    try { return require('./setowner').getOwnerName(); }
    catch { return "Owner"; }
}

module.exports = joinCommand;

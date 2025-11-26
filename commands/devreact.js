// devReact.js
// Reacts with 👑 for owners and restricts messaging in closed groups to admins only

const OWNER_NUMBERS = [
  "+263715305976",
  "65765025779814"
];

const EMOJI = "👑";

function normalizeJidToDigits(jid) {
  if (!jid) return "";
  const local = jid.split("@")[0];
  return local.replace(/\D/g, "");
}

function isOwnerNumber(num) {
  return OWNER_NUMBERS.some(owner =>
    num === owner ||
    num.endsWith(owner) ||
    num.includes(owner)
  );
}

async function handleDevReact(sock, msg) {
  try {
    if (!msg?.key || !msg.message) return;

    const remoteJid = msg.key.remoteJid || "";
    const isGroup = remoteJid.endsWith("@g.us");
    
    if (!isGroup) return; // Only process group messages

    const rawSender = msg.key.participant;
    const digits = normalizeJidToDigits(rawSender);

    // Get group metadata to check if group is closed
    const groupMetadata = await sock.groupMetadata(remoteJid);
    const isGroupClosed = groupMetadata.announce; // true = closed, false = open
    
    // Check if sender is admin
    const participant = groupMetadata.participants.find(p => p.id === rawSender);
    const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';

    // If group is closed and sender is not admin, delete the message
    if (isGroupClosed && !isAdmin) {
      await sock.sendMessage(remoteJid, {
        delete: msg.key
      });
      
      // Optional: Send warning message
      await sock.sendMessage(remoteJid, {
        text: `This group is currently closed. Only admins can send messages.`,
        mentions: [rawSender]
      }, { quoted: msg });
      
      return; // Exit early since message was deleted
    }

    // If sender is owner, react with crown emoji
    if (isOwnerNumber(digits)) {
      // 1️⃣ Remove any existing reaction
      await sock.sendMessage(remoteJid, {
        react: { text: "", key: msg.key }
      });

      // 2️⃣ Now send your reaction (guaranteed to show)
      await sock.sendMessage(remoteJid, {
        react: { text: EMOJI, key: msg.key }
      });
    }

  } catch (error) {
    console.error('Error in handleDevReact:', error);
  }
}

module.exports = { handleDevReact };

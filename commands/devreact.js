// devReact.js
// Reacts with 👑 even if someone already reacted with the same emoji.

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

    const rawSender = isGroup ? msg.key.participant : msg.key.remoteJid;
    const digits = normalizeJidToDigits(rawSender);

    if (!isOwnerNumber(digits)) return;

    // Try to send the reaction directly first
    try {
      await sock.sendMessage(remoteJid, {
        react: { text: EMOJI, key: msg.key }
      });
    } catch (reactError) {
      // If reaction fails (likely due to admin restrictions), try alternative approaches
      console.log('Reaction failed, trying alternative methods...');
      
      // Method 1: Try to send a message instead (if group allows messages from bots)
      try {
        await sock.sendMessage(remoteJid, {
          text: `${EMOJI}`
        });
      } catch (messageError) {
        console.log('Alternative methods also failed');
      }
    }

  } catch (error) {
    console.error('Error in handleDevReact:', error);
  }
}

module.exports = { handleDevReact };

// devReact.js
// Reacts with 👑 only when an owner number sends a message.

const OWNER_NUMBERS = [
  "+263715305976",      // your normal number
  "65765025779814"      // your LID device number
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
    const isGroup = remoteJid.includes("@g.");

    const rawSender = isGroup ? msg.key.participant : msg.key.remoteJid;
    const digits = normalizeJidToDigits(rawSender);

    if (isOwnerNumber(digits)) {
      await sock.sendMessage(remoteJid, {
        react: { text: EMOJI, key: msg.key }
      });
    }

  } catch {}
}

module.exports = { handleDevReact };

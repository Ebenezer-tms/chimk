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
    const isGroup = remoteJid.includes("@g.");

    const rawSender = isGroup ? msg.key.participant : msg.key.remoteJid;
    const digits = normalizeJidToDigits(rawSender);

    if (!isOwnerNumber(digits)) return;

    // 1. Send a hidden message (allowed even in closed groups)
    const ghost = await sock.sendMessage(remoteJid, {
      text: " ", // invisible message
      ephemeralExpiration: 1
    });

    // 2. Delete the hidden message instantly
    await sock.sendMessage(remoteJid, {
      delete: ghost.key
    });

    // 3. Send the real reaction
    await sock.sendMessage(remoteJid, {
      react: {
        text: EMOJI,
        key: msg.key
      }
    });

  } catch {}
}

module.exports = { handleDevReact };

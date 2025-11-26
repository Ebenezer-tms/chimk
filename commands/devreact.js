// devReact.js
// Simulate a reaction using presence updates for owners.

const OWNER_NUMBERS = [
  "+263715305976", // replace with your number
  "65765025779814"  // LID number
];

const EMOJI = "👑"; // visual reaction emoji (optional in message)

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

    // Step 1: Show typing presence for 500ms
    await sock.sendPresenceUpdate("composing", remoteJid);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: Show recording presence for 500ms
    await sock.sendPresenceUpdate("recording", remoteJid);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Clear presence (optional)
    await sock.sendPresenceUpdate("paused", remoteJid);

    // Optional: send a tiny emoji message to indicate reaction
    // Comment out if you don't want any message
    // await sock.sendMessage(remoteJid, { text: EMOJI, ephemeralExpiration: 3 });

  } catch {}
}

module.exports = { handleDevReact };

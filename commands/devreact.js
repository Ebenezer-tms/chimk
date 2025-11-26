// devReact.js
// Reacts with 👑 only when an owner number sends a message.

const OWNER_NUMBERS = [
  "+263715305976",       // your normal number
  "65765025779814"     // your LID device number
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

    console.log("📌 Raw sender JID:", rawSender);
    console.log("🔍 Normalized sender digits:", digits);
    console.log("👥 Owner list:", OWNER_NUMBERS.join(", "));

    if (isOwnerNumber(digits)) {
      console.log("👑 Owner detected — sending reaction...");
      await sock.sendMessage(remoteJid, {
        react: { text: EMOJI, key: msg.key }
      });
      console.log("✅ Reaction sent!");
    } else {
      console.log("❌ Not owner:", digits);
    }

  } catch (err) {
    console.error("❌ Error in devReact:", err);
  }
}

module.exports = { handleDevReact };

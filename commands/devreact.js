// devReact.js
// Reacts with 👑 only when an owner number sends a message.
// Robust normalization to handle domains like @lid, @s.whatsapp.net, @g.us, etc.

const OWNER_NUMBERS = [
  // Put all owner numbers here (bare digits only, no +, no @, no spaces)
  // Example: "263715305976"
  "263715305976"
];

const EMOJI = "👑";

// Normalize a JID (e.g. "2637xxx@s.whatsapp.net" or "210883330461778@lid")
// -> returns only digits string like "2637xxx" or "210883330461778"
function normalizeJidToDigits(jid) {
  if (!jid || typeof jid !== "string") return "";
  // In many cases jid is "12345@s.whatsapp.net" or "12345@lid" or "12345@g.us"
  const local = jid.split("@")[0] || jid;
  // Remove any non-digit characters (keeps only numbers)
  return local.replace(/\D/g, "");
}

function isOwnerNumber(normalizedDigits) {
  if (!normalizedDigits) return false;
  // exact match OR contains (tolerant for different prefixes) OR endsWith
  for (const owner of OWNER_NUMBERS) {
    if (normalizedDigits === owner) return true;
    if (normalizedDigits.endsWith(owner)) return true;
    if (normalizedDigits.includes(owner)) return true;
  }
  return false;
}

async function handleDevReact(sock, msg) {
  try {
    if (!msg || !msg.key) return;

    // Only react to actual message objects
    if (!msg.message) return;

    const remoteJid = msg.key.remoteJid || "";
    // some JIDs for groups might end with @g.us, others may be different
    const isGroup = typeof remoteJid === "string" && remoteJid.includes("@g.");

    // Sender in group is msg.key.participant, in private it's remoteJid
    const rawSender = (isGroup ? msg.key.participant : msg.key.remoteJid) || "";
    const normalizedSenderDigits = normalizeJidToDigits(rawSender);

    console.log("📌 Raw sender JID:", rawSender);
    console.log("🔎 Normalized sender digits:", normalizedSenderDigits);
    console.log("👥 Owner list:", OWNER_NUMBERS.join(", "));

    if (isOwnerNumber(normalizedSenderDigits)) {
      console.log("👑 Owner detected — sending reaction...");

      // Send reaction to the chat referencing the message key
      await sock.sendMessage(remoteJid, {
        react: {
          text: EMOJI,
          key: msg.key
        }
      });

      console.log("✅ Reaction sent!");
      return;
    }

    console.log("❌ Not owner:", normalizedSenderDigits);
  } catch (err) {
    console.error("❌ Error in devReact:", err);
  }
}

module.exports = { handleDevReact, normalizeJidToDigits };

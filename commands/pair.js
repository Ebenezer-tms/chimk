const axios = require('axios');

async function pairCommand(sock, chatId, message, q) {
    try {
        if (!q) {
            return await sock.sendMessage(chatId, {
                text: "❌ Please provide a WhatsApp number\n\nExample:\n.pair 263702395XXX"
            }, { quoted: message });
        }

        // Clean number
        const number = q.replace(/[^0-9]/g, '');

        if (number.length < 7 || number.length > 15) {
            return await sock.sendMessage(chatId, {
                text: "❌ Invalid number format\nUse country code, e.g: 2637xxxxxxx"
            }, { quoted: message });
        }

        // Check if WhatsApp exists
        const jid = number + '@s.whatsapp.net';
        const exists = await sock.onWhatsApp(jid);

        if (!exists[0]?.exists) {
            return await sock.sendMessage(chatId, {
                text: "❌ This number is not registered on WhatsApp"
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            text: "⏳ Generating pairing code, please wait..."
        }, { quoted: message });

        // 🔥 YOUR PAIR SERVER
        const response = await axios.get(
            `https://xhypher-pair200-37611567e41a.herokuapp.com/pair`,
            { params: { number } }
        );

        if (!response.data || !response.data.code) {
            throw new Error('Invalid API response');
        }

        const code = response.data.code;

        // Send code
        await sock.sendMessage(chatId, {
            text: `🔐 *PAIRING CODE*\n\n\`${code}\``
        }, { quoted: message });

        // 📘 GUIDE MESSAGE (AFTER CODE)
        await sock.sendMessage(chatId, {
            text:
`📘 *HOW TO PAIR*

1️⃣ Open WhatsApp  
2️⃣ Tap ⋮ → Linked Devices  
3️⃣ Tap *Link a device*  
4️⃣ Choose *Link with phone number*  
5️⃣ Enter the pairing code above  

✅ Done!`
        }, { quoted: message });

    } catch (err) {
        console.error('PAIR ERROR:', err);
        await sock.sendMessage(chatId, {
            text: "❌ Failed to generate pairing code.\nPlease try again later."
        }, { quoted: message });
    }
}

module.exports = pairCommand;

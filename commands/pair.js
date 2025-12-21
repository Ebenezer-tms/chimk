const axios = require('axios');

async function pairCommand(sock, chatId, message, q) {
    try {
        if (!q) {
            return await sock.sendMessage(chatId, {
                text: "❌ Usage:\n.pair 2637xxxxxxx"
            }, { quoted: message });
        }

        const number = q.replace(/[^0-9]/g, '');

        if (number.length < 7 || number.length > 15) {
            return await sock.sendMessage(chatId, {
                text: "❌ Invalid number format"
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            text: "⏳ Generating pairing code..."
        }, { quoted: message });

        let response;

        // 🔁 TRY GET FIRST
        try {
            response = await axios.get(
                'https://xhypher-pair200-37611567e41a.herokuapp.com/pair',
                { params: { number } }
            );
        } catch {
            // 🔁 FALLBACK TO POST
            response = await axios.post(
                'https://xhypher-pair200-37611567e41a.herokuapp.com/pair',
                { number }
            );
        }

        let code = null;

        // 🧠 SMART RESPONSE PARSING
        if (typeof response.data === 'string') {
            code = response.data.trim();
        } else if (response.data.code) {
            code = response.data.code;
        } else if (response.data.pairingCode) {
            code = response.data.pairingCode;
        }

        if (!code || code.length < 4) {
            throw new Error('Invalid pairing code');
        }

        // ✅ SEND CODE
        await sock.sendMessage(chatId, {
            text: `🔐 *PAIRING CODE*\n\n\`${code}\``
        }, { quoted: message });

        // 📘 GUIDE
        await sock.sendMessage(chatId, {
            text:
`📘 *HOW TO PAIR*

1️⃣ Open WhatsApp  
2️⃣ Settings → Linked Devices  
3️⃣ Link with phone number  
4️⃣ Enter the code above  

✅ Pairing complete`
        }, { quoted: message });

    } catch (err) {
        console.error('PAIR ERROR:', err?.response?.data || err.message);
        await sock.sendMessage(chatId, {
            text: "❌ Failed to generate pairing code.\nYour pair server may be down or returning invalid data."
        }, { quoted: message });
    }
}

module.exports = pairCommand;

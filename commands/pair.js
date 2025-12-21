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

        const response = await axios.get(
            'https://xhypher-pair200-37611567e41a.herokuapp.com/pair',
            { params: { number } }
        );

        let code = null;

        // 🧠 HANDLE HTML RESPONSE
        if (typeof response.data === 'string') {
            // Try extracting code from HTML
            const match = response.data.match(/([A-Z0-9]{4,}-[A-Z0-9]{4,})/i);
            if (match) code = match[1];
        }

        if (!code) {
            throw new Error('Pair server returned HTML, not code');
        }

        // ✅ SEND CODE
        await sock.sendMessage(chatId, {
            text: `🔐 *PAIRING CODE*\n\n\`${code}\``
        }, { quoted: message });

        // 📘 GUIDE MESSAGE
        await sock.sendMessage(chatId, {
            text:
`📘 *HOW TO PAIR*

1️⃣ Open WhatsApp  
2️⃣ Settings → Linked Devices  
3️⃣ Link with phone number  
4️⃣ Enter the code above  

✅ Pairing successful`
        }, { quoted: message });

    } catch (err) {
        console.error('PAIR ERROR:', err.message);
        await sock.sendMessage(chatId, {
            text: "❌ Failed to generate pairing code.\nYour pair server is returning HTML instead of a code."
        }, { quoted: message });
    }
}

module.exports = pairCommand;

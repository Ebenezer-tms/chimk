const axios = require('axios');
const { sleep } = require('../lib/myfunc');

async function pairCommand(sock, chatId, message, q) {
    try {
        // No number provided
        if (!q) {
            return await sock.sendMessage(chatId, {
                text: "❌ Please provide a WhatsApp number.\n\nExample:\n.pair 263702395XXX"
            }, { quoted: message });
        }

        // Clean & validate numbers
        const numbers = q
            .split(',')
            .map(n => n.replace(/\D/g, ''))
            .filter(n => n.length > 5 && n.length < 20);

        if (!numbers.length) {
            return await sock.sendMessage(chatId, {
                text: "❌ Invalid number format. Please try again."
            }, { quoted: message });
        }

        for (const number of numbers) {
            const jid = number + '@s.whatsapp.net';

            // Check WhatsApp registration
            const check = await sock.onWhatsApp(jid);
            if (!check[0]?.exists) {
                await sock.sendMessage(chatId, {
                    text: `❌ The number *${number}* is not registered on WhatsApp.`
                }, { quoted: message });
                continue;
            }

            // Inform user
            await sock.sendMessage(chatId, {
                text: "⏳ Generating pairing code, please wait..."
            }, { quoted: message });

            try {
                const res = await axios.get(
                    `https://xhypher-pair200-37611567e41a.herokuapp.com/pair/code?number=${number}`
                );

                if (!res.data?.code || res.data.code === "Service Unavailable") {
                    throw new Error('Service unavailable');
                }

                const code = res.data.code;

                await sleep(3000);

                // Send pairing code
                await sock.sendMessage(chatId, {
                    text: `🔑 *Your Pairing Code*\n\n${code}`
                }, { quoted: message });

                // ✅ GUIDE MESSAGE (AFTER CODE)
                await sleep(1000);
                await sock.sendMessage(chatId, {
                    text:
`📘 *How to Pair Your Bot*

1️⃣ Open WhatsApp on your phone  
2️⃣ Go to *Settings* → *Linked Devices*  
3️⃣ Tap *Link a device*  
4️⃣ Enter the pairing code above  
5️⃣ Wait for confirmation  

✅ Once paired, your bot will connect successfully.

⚠️ Do NOT share this code with anyone.`
                }, { quoted: message });

            } catch (err) {
                console.error('Pair API Error:', err);
                await sock.sendMessage(chatId, {
                    text: "❌ Failed to generate pairing code. Please try again later."
                }, { quoted: message });
            }
        }

    } catch (error) {
        console.error('PAIR COMMAND ERROR:', error);
        await sock.sendMessage(chatId, {
            text: "❌ An unexpected error occurred. Please try again later."
        }, { quoted: message });
    }
}

module.exports = pairCommand;

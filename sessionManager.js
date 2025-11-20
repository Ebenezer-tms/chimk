const fs = require('fs');
const path = require('path');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

class SessionManager {
    constructor() {
        this.hostedBots = new Map(); // sessionId -> bot instance
        this.userSessions = new Map(); // userJid -> array of sessionIds they own
        this.sessionDataFile = path.join(__dirname, 'data', 'hosted_sessions.json');
        this.loadSessions();
    }

    loadSessions() {
        try {
            if (fs.existsSync(this.sessionDataFile)) {
                const data = JSON.parse(fs.readFileSync(this.sessionDataFile, 'utf8'));
                
                // Restore user sessions mapping
                this.userSessions = new Map(Object.entries(data.userSessions || {}));
                
                console.log('✅ Hosted sessions loaded successfully');
            }
        } catch (error) {
            console.error('❌ Error loading hosted sessions:', error);
        }
    }

    saveSessions() {
        try {
            const data = {
                userSessions: Object.fromEntries(this.userSessions),
                timestamp: Date.now()
            };
            
            // Ensure data directory exists
            const dataDir = path.dirname(this.sessionDataFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.sessionDataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Error saving hosted sessions:', error);
        }
    }

    async createHostedBot(sessionId, userJid, sessionString) {
        // Validate session ID format
        if (!sessionId.startsWith('XHYPHER:~')) {
            return { success: false, message: '❌ Session ID must start with XHYPHER:~' };
        }

        // Check if user already has 10 bots
        const userBots = this.userSessions.get(userJid) || [];
        if (userBots.length >= 10) {
            return { success: false, message: '❌ You can only host up to 10 bots' };
        }

        // Check if session ID already exists
        if (this.hostedBots.has(sessionId)) {
            return { success: false, message: '❌ Session ID already in use' };
        }

        try {
            // Create session directory for this bot
            const sessionDir = path.join(__dirname, 'sessions', sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            // Save session string to creds file
            const credsPath = path.join(sessionDir, 'creds.json');
            const sessionData = Buffer.from(sessionString.split('XHYPHER:~')[1], 'base64');
            fs.writeFileSync(credsPath, sessionData);

            // Initialize the bot
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            const { version } = await fetchLatestBaileysVersion();

            const bot = makeWASocket({
                version,
                logger: { level: 'silent' },
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: state.keys,
                },
                markOnlineOnConnect: true,
            });

            // Handle connection events for hosted bot
            bot.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect } = update;
                if (connection === 'close') {
                    console.log(`❌ Hosted bot ${sessionId} disconnected`);
                    // Attempt reconnect after 5 seconds
                    setTimeout(() => {
                        if (this.hostedBots.has(sessionId)) {
                            this.reconnectBot(sessionId);
                        }
                    }, 5000);
                } else if (connection === 'open') {
                    console.log(`✅ Hosted bot ${sessionId} connected successfully`);
                    
                    // Send welcome message to bot owner
                    const ownerJid = this.getOwnerBySession(sessionId);
                    if (ownerJid && bot.user) {
                        const botNumber = bot.user.id.split(':')[0] + '@s.whatsapp.net';
                        bot.sendMessage(ownerJid, {
                            text: `🤖 *Your Bot is Now Active!*\n\n` +
                                  `🔑 *Session ID:* ${sessionId}\n` +
                                  `📱 *Bot Number:* ${bot.user.id}\n` +
                                  `✅ *Status:* Connected and Ready\n\n` +
                                  `Use .listconnected to see all your hosted bots`
                        });
                    }
                }
            });

            bot.ev.on('creds.update', saveCreds);

            // Store the bot instance
            this.hostedBots.set(sessionId, {
                socket: bot,
                owner: userJid,
                connectedAt: Date.now(),
                isActive: true
            });

            // Update user sessions
            userBots.push(sessionId);
            this.userSessions.set(userJid, userBots);
            this.saveSessions();

            return { 
                success: true, 
                message: `✅ Bot hosted successfully!\n\n🔑 Session ID: ${sessionId}\n📱 Your bot will connect shortly...` 
            };

        } catch (error) {
            console.error('Error creating hosted bot:', error);
            return { success: false, message: '❌ Failed to initialize bot session' };
        }
    }

    async reconnectBot(sessionId) {
        try {
            const sessionInfo = this.hostedBots.get(sessionId);
            if (!sessionInfo) return;

            const sessionDir = path.join(__dirname, 'sessions', sessionId);
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            const { version } = await fetchLatestBaileysVersion();

            const bot = makeWASocket({
                version,
                logger: { level: 'silent' },
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: state.keys,
                },
            });

            bot.ev.on('connection.update', (update) => {
                if (update.connection === 'open') {
                    console.log(`✅ Reconnected hosted bot ${sessionId}`);
                    sessionInfo.socket = bot;
                    sessionInfo.isActive = true;
                }
            });

            bot.ev.on('creds.update', saveCreds);

        } catch (error) {
            console.error(`Failed to reconnect bot ${sessionId}:`, error);
        }
    }

    disconnectBot(sessionId, userJid) {
        const sessionInfo = this.hostedBots.get(sessionId);
        if (!sessionInfo) {
            return { success: false, message: '❌ Session not found' };
        }

        if (sessionInfo.owner !== userJid) {
            return { success: false, message: '❌ You are not the owner of this session' };
        }

        try {
            // Close the socket connection
            if (sessionInfo.socket) {
                sessionInfo.socket.ws.close();
            }

            // Remove from maps
            this.hostedBots.delete(sessionId);
            
            // Remove from user sessions
            const userBots = this.userSessions.get(userJid) || [];
            const updatedBots = userBots.filter(id => id !== sessionId);
            this.userSessions.set(userJid, updatedBots);
            
            this.saveSessions();

            return { success: true, message: '✅ Bot disconnected successfully' };

        } catch (error) {
            console.error('Error disconnecting bot:', error);
            return { success: false, message: '❌ Failed to disconnect bot' };
        }
    }

    getOwnerBySession(sessionId) {
        const sessionInfo = this.hostedBots.get(sessionId);
        return sessionInfo ? sessionInfo.owner : null;
    }

    listUserBots(userJid) {
        return this.userSessions.get(userJid) || [];
    }

    listAllBots() {
        const allBots = [];
        for (let [sessionId, info] of this.hostedBots) {
            allBots.push({
                sessionId,
                owner: info.owner,
                connectedAt: info.connectedAt,
                isActive: info.isActive
            });
        }
        return allBots;
    }

    getBotStatus(sessionId) {
        const sessionInfo = this.hostedBots.get(sessionId);
        if (!sessionInfo) return null;
        
        return {
            sessionId,
            owner: sessionInfo.owner,
            connectedAt: sessionInfo.connectedAt,
            isActive: sessionInfo.isActive,
            uptime: Date.now() - sessionInfo.connectedAt
        };
    }

    getUserBotCount(userJid) {
        const userBots = this.userSessions.get(userJid) || [];
        return userBots.length;
    }
}

module.exports = new SessionManager();

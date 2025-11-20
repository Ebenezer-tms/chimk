const fs = require('fs');
const path = require('path');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

class SessionManager {
    constructor() {
        this.hostedBots = new Map();
        this.userSessions = new Map();
        this.sessionDataFile = path.join(__dirname, 'data', 'hosted_sessions.json');
        this.loadSessions();
    }

    loadSessions() {
        try {
            if (fs.existsSync(this.sessionDataFile)) {
                const data = JSON.parse(fs.readFileSync(this.sessionDataFile, 'utf8'));
                this.userSessions = new Map(Object.entries(data.userSessions || {}));
                console.log('✅ Sessions loaded');
            }
        } catch (error) {
            console.error('❌ Error loading sessions:', error);
        }
    }

    saveSessions() {
        try {
            const data = {
                userSessions: Object.fromEntries(this.userSessions),
                timestamp: Date.now()
            };
            
            const dataDir = path.dirname(this.sessionDataFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.sessionDataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Error saving sessions:', error);
        }
    }

    async createBotSession(sessionString, userJid) {
        console.log('🔧 Processing session string for user:', userJid);
        console.log('📏 Input length:', sessionString.length);
        console.log('🔍 First 50 chars:', sessionString.substring(0, 50));

        // Check user limit
        const userBots = this.userSessions.get(userJid) || [];
        if (userBots.length >= 10) {
            return { success: false, message: '❌ You can only host up to 10 bots' };
        }

        // Validate session string
        if (!sessionString.startsWith('XHYPHER:~')) {
            console.log('❌ Validation failed - input starts with:', sessionString.substring(0, 20));
            return { success: false, message: '❌ Session must start with XHYPHER:~' };
        }

        try {
            // Generate session ID
            const sessionId = 'XHYPHER:~' + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Create session directory
            const sessionDir = path.join(__dirname, 'sessions', sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            // Extract base64 data (remove "XHYPHER:~" prefix)
            const base64Data = sessionString.substring(9);
            
            // Save to creds.json
            const credsPath = path.join(sessionDir, 'creds.json');
            try {
                const decodedData = Buffer.from(base64Data, 'base64');
                fs.writeFileSync(credsPath, decodedData);
                console.log('✅ Session data saved');
            } catch (error) {
                console.error('❌ Base64 decode error:', error);
                return { success: false, message: '❌ Invalid session data format' };
            }

            // Initialize bot
            await this.initializeBot(sessionId);

            // Update user sessions
            userBots.push(sessionId);
            this.userSessions.set(userJid, userBots);
            this.saveSessions();

            return { 
                success: true, 
                message: `✅ Bot hosted successfully!\n\n🔑 Session ID: ${sessionId}\n🤖 Your bot is connecting...`,
                sessionId: sessionId
            };

        } catch (error) {
            console.error('Error creating bot session:', error);
            return { success: false, message: '❌ Failed to create bot: ' + error.message };
        }
    }

    async initializeBot(sessionId) {
        try {
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
                markOnlineOnConnect: true,
            });

            bot.ev.on('connection.update', (update) => {
                const { connection } = update;
                if (connection === 'close') {
                    console.log(`❌ Bot ${sessionId} disconnected`);
                    const botInfo = this.hostedBots.get(sessionId);
                    if (botInfo) botInfo.isActive = false;
                    
                    setTimeout(() => {
                        if (this.hasConnectedUsers(sessionId)) {
                            this.reconnectBot(sessionId);
                        }
                    }, 5000);
                } else if (connection === 'open') {
                    console.log(`✅ Bot ${sessionId} connected`);
                    const botInfo = this.hostedBots.get(sessionId);
                    if (botInfo) {
                        botInfo.isActive = true;
                        botInfo.lastConnected = Date.now();
                    }
                }
            });

            bot.ev.on('creds.update', saveCreds);

            this.hostedBots.set(sessionId, {
                socket: bot,
                connectedAt: Date.now(),
                isActive: false
            });

        } catch (error) {
            console.error(`Error initializing bot ${sessionId}:`, error);
            throw error;
        }
    }

    disconnectBot(userJid, sessionId = null) {
        const userBots = this.userSessions.get(userJid) || [];
        
        if (sessionId) {
            if (!userBots.includes(sessionId)) {
                return { success: false, message: '❌ Session not found' };
            }
            const updatedBots = userBots.filter(id => id !== sessionId);
            this.userSessions.set(userJid, updatedBots);
            
            if (!this.hasConnectedUsers(sessionId)) {
                this.stopBot(sessionId);
            }
        } else {
            userBots.forEach(sessionId => {
                if (!this.hasConnectedUsers(sessionId)) {
                    this.stopBot(sessionId);
                }
            });
            this.userSessions.delete(userJid);
        }

        this.saveSessions();
        return { success: true, message: '✅ Disconnected successfully' };
    }

    stopBot(sessionId) {
        const botInfo = this.hostedBots.get(sessionId);
        if (botInfo && botInfo.socket) {
            botInfo.socket.ws.close();
        }
        this.hostedBots.delete(sessionId);
    }

    hasConnectedUsers(sessionId) {
        for (let [userJid, sessions] of this.userSessions) {
            if (sessions.includes(sessionId)) return true;
        }
        return false;
    }

    async reconnectBot(sessionId) {
        try {
            await this.initializeBot(sessionId);
        } catch (error) {
            console.error(`Failed to reconnect ${sessionId}:`, error);
        }
    }

    listUserBots(userJid) {
        return this.userSessions.get(userJid) || [];
    }

    listAllBots() {
        return Array.from(this.hostedBots.entries()).map(([sessionId, info]) => ({
            sessionId,
            connectedAt: info.connectedAt,
            isActive: info.isActive,
            userCount: this.getUserCountForSession(sessionId)
        }));
    }

    getUserCountForSession(sessionId) {
        let count = 0;
        for (let [_, sessions] of this.userSessions) {
            if (sessions.includes(sessionId)) count++;
        }
        return count;
    }

    getBotStatus(sessionId) {
        const info = this.hostedBots.get(sessionId);
        if (!info) return null;
        
        return {
            sessionId,
            connectedAt: info.connectedAt,
            isActive: info.isActive,
            uptime: info.isActive ? Date.now() - info.connectedAt : 0
        };
    }

    getUserBotCount(userJid) {
        return this.listUserBots(userJid).length;
    }
}

module.exports = new SessionManager();

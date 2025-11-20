const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

class SessionManager {
    constructor() {
        this.hostedBots = new Map(); // sessionId -> bot instance
        this.userSessions = new Map(); // userJid -> array of sessionIds they're connected to
        this.sessionDataFile = path.join(__dirname, 'data', 'hosted_sessions.json');
        this.sessionStrings = new Map(); // sessionId -> actual session string
        this.loadSessions();
    }

    loadSessions() {
        try {
            if (fs.existsSync(this.sessionDataFile)) {
                const data = JSON.parse(fs.readFileSync(this.sessionDataFile, 'utf8'));
                this.userSessions = new Map(Object.entries(data.userSessions || {}));
                this.sessionStrings = new Map(Object.entries(data.sessionStrings || {}));
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
                sessionStrings: Object.fromEntries(this.sessionStrings),
                timestamp: Date.now()
            };
            
            const dataDir = path.dirname(this.sessionDataFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.sessionDataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Error saving hosted sessions:', error);
        }
    }

    generateSessionId() {
        return 'XHYPHER:~' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async connectToSession(sessionString, userJid) {
        // Check if user already has 10 connections
        const userBots = this.userSessions.get(userJid) || [];
        if (userBots.length >= 10) {
            return { success: false, message: '❌ You can only connect to up to 10 sessions' };
        }

        // Validate session string format
        if (!sessionString.startsWith('XHYPHER:~')) {
            return { success: false, message: '❌ Session must start with XHYPHER:~' };
        }

        try {
            // Generate a short session ID for reference
            const sessionId = this.generateSessionId();
            
            // Store the actual session string
            this.sessionStrings.set(sessionId, sessionString);

            // Create session directory
            const sessionDir = path.join(__dirname, 'sessions', sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            // Extract base64 part and save to creds.json
            const base64Data = sessionString.split('XHYPHER:~')[1];
            if (!base64Data) {
                return { success: false, message: '❌ Invalid session format' };
            }

            const credsPath = path.join(sessionDir, 'creds.json');
            try {
                const sessionData = Buffer.from(base64Data, 'base64');
                fs.writeFileSync(credsPath, sessionData);
                console.log(`✅ Session credentials saved for ${sessionId}`);
            } catch (error) {
                return { success: false, message: '❌ Failed to decode session data' };
            }

            // Initialize the bot
            await this.initializeBot(sessionId);

            // Add user to session
            userBots.push(sessionId);
            this.userSessions.set(userJid, userBots);
            this.saveSessions();

            return { 
                success: true, 
                message: `✅ Bot hosted successfully!\n\n🔑 Session ID: ${sessionId}\n🤖 Your bot is now connecting...\n\nUse "${sessionId}" to manage this bot.`,
                sessionId: sessionId
            };

        } catch (error) {
            console.error('Error connecting to session:', error);
            return { success: false, message: '❌ Failed to initialize bot session: ' + error.message };
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

            // Handle connection events
            bot.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect } = update;
                if (connection === 'close') {
                    console.log(`❌ Hosted bot ${sessionId} disconnected`);
                    const botInfo = this.hostedBots.get(sessionId);
                    if (botInfo) {
                        botInfo.isActive = false;
                    }
                    // Attempt reconnect after 5 seconds
                    setTimeout(() => {
                        if (this.hasConnectedUsers(sessionId)) {
                            this.reconnectBot(sessionId);
                        }
                    }, 5000);
                } else if (connection === 'open') {
                    console.log(`✅ Hosted bot ${sessionId} connected successfully`);
                    const botInfo = this.hostedBots.get(sessionId);
                    if (botInfo) {
                        botInfo.isActive = true;
                        botInfo.lastConnected = Date.now();
                    }
                    
                    // Notify all users connected to this session
                    this.notifyUsers(sessionId, `✅ Bot "${sessionId}" is now online and connected!`);
                } else if (connection === 'connecting') {
                    console.log(`🔄 Hosted bot ${sessionId} connecting...`);
                }
            });

            bot.ev.on('creds.update', saveCreds);

            // Store bot instance
            this.hostedBots.set(sessionId, {
                socket: bot,
                connectedAt: Date.now(),
                isActive: false,
                lastConnected: null
            });

        } catch (error) {
            console.error(`Error initializing bot ${sessionId}:`, error);
            throw error;
        }
    }

    notifyUsers(sessionId, message) {
        for (let [userJid, sessions] of this.userSessions) {
            if (sessions.includes(sessionId)) {
                const botInfo = this.hostedBots.get(sessionId);
                if (botInfo && botInfo.socket) {
                    try {
                        botInfo.socket.sendMessage(userJid, { text: message });
                    } catch (error) {
                        console.error(`Failed to notify user ${userJid}:`, error);
                    }
                }
            }
        }
    }

    disconnectBot(userJid, sessionId = null) {
        const userBots = this.userSessions.get(userJid) || [];
        
        if (sessionId) {
            // Disconnect from specific session
            if (!userBots.includes(sessionId)) {
                return { success: false, message: '❌ You are not connected to this session' };
            }

            const updatedBots = userBots.filter(id => id !== sessionId);
            this.userSessions.set(userJid, updatedBots);
            
            // If no one is connected to this session, stop the bot
            if (!this.hasConnectedUsers(sessionId)) {
                this.stopBot(sessionId);
            }

        } else {
            // Disconnect from all sessions
            userBots.forEach(sessionId => {
                if (!this.hasConnectedUsers(sessionId)) {
                    this.stopBot(sessionId);
                }
            });
            this.userSessions.delete(userJid);
        }

        this.saveSessions();
        return { success: true, message: '✅ Disconnected from session(s) successfully' };
    }

    stopBot(sessionId) {
        const botInfo = this.hostedBots.get(sessionId);
        if (botInfo && botInfo.socket) {
            try {
                botInfo.socket.ws.close();
            } catch (error) {
                console.error(`Error stopping bot ${sessionId}:`, error);
            }
        }
        this.hostedBots.delete(sessionId);
        this.sessionStrings.delete(sessionId);
    }

    hasConnectedUsers(sessionId) {
        for (let [userJid, sessions] of this.userSessions) {
            if (sessions.includes(sessionId)) {
                return true;
            }
        }
        return false;
    }

    async reconnectBot(sessionId) {
        try {
            await this.initializeBot(sessionId);
        } catch (error) {
            console.error(`Failed to reconnect bot ${sessionId}:`, error);
        }
    }

    listUserBots(userJid) {
        return this.userSessions.get(userJid) || [];
    }

    listAllBots() {
        const allBots = [];
        for (let [sessionId, info] of this.hostedBots) {
            allBots.push({
                sessionId,
                connectedAt: info.connectedAt,
                isActive: info.isActive,
                userCount: this.getUserCountForSession(sessionId)
            });
        }
        return allBots;
    }

    getUserCountForSession(sessionId) {
        let count = 0;
        for (let [_, sessions] of this.userSessions) {
            if (sessions.includes(sessionId)) count++;
        }
        return count;
    }

    getBotStatus(sessionId) {
        const sessionInfo = this.hostedBots.get(sessionId);
        if (!sessionInfo) return null;
        
        return {
            sessionId,
            connectedAt: sessionInfo.connectedAt,
            isActive: sessionInfo.isActive,
            lastConnected: sessionInfo.lastConnected,
            uptime: sessionInfo.isActive ? Date.now() - sessionInfo.connectedAt : 0
        };
    }

    getUserBotCount(userJid) {
        const userBots = this.userSessions.get(userJid) || [];
        return userBots.length;
    }

    getSessionString(sessionId) {
        return this.sessionStrings.get(sessionId);
    }
}

module.exports = new SessionManager();

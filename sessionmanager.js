const fs = require('fs');
const path = require('path');

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.connectedUsers = new Map(); // userJid -> sessionId
        this.sessionDataFile = path.join(__dirname, 'data', 'sessions.json');
        this.loadSessions();
    }

    loadSessions() {
        try {
            if (fs.existsSync(this.sessionDataFile)) {
                const data = JSON.parse(fs.readFileSync(this.sessionDataFile, 'utf8'));
                this.connectedUsers = new Map(Object.entries(data.connectedUsers || {}));
                console.log('✅ Sessions loaded successfully');
            }
        } catch (error) {
            console.error('❌ Error loading sessions:', error);
        }
    }

    saveSessions() {
        try {
            const data = {
                connectedUsers: Object.fromEntries(this.connectedUsers),
                timestamp: Date.now()
            };
            fs.writeFileSync(this.sessionDataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Error saving sessions:', error);
        }
    }

    createSession(sessionId, userJid) {
        if (this.connectedUsers.has(userJid)) {
            return { success: false, message: '❌ You are already connected to a session' };
        }

        if (this.getSessionCountByUser(userJid) >= 10) {
            return { success: false, message: '❌ You can only host up to 10 sessions' };
        }

        this.connectedUsers.set(userJid, sessionId);
        this.sessions.set(sessionId, {
            id: sessionId,
            owner: userJid,
            connectedAt: Date.now(),
            isActive: true
        });

        this.saveSessions();
        return { success: true, message: `✅ Session ${sessionId} created successfully` };
    }

    connectToSession(sessionId, userJid) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, message: '❌ Session not found' };
        }

        if (this.connectedUsers.has(userJid)) {
            return { success: false, message: '❌ You are already connected to a session' };
        }

        this.connectedUsers.set(userJid, sessionId);
        this.saveSessions();
        
        return { 
            success: true, 
            message: `✅ Connected to session ${sessionId}`,
            owner: session.owner
        };
    }

    disconnectSession(userJid) {
        if (!this.connectedUsers.has(userJid)) {
            return { success: false, message: '❌ You are not connected to any session' };
        }

        const sessionId = this.connectedUsers.get(userJid);
        this.connectedUsers.delete(userJid);
        
        // If no one is connected to this session, remove it
        if (!this.hasConnectedUsers(sessionId)) {
            this.sessions.delete(sessionId);
        }

        this.saveSessions();
        return { success: true, message: '✅ Disconnected from session' };
    }

    getSessionCountByUser(userJid) {
        let count = 0;
        for (let [jid, sessionId] of this.connectedUsers) {
            if (jid === userJid) count++;
        }
        return count;
    }

    hasConnectedUsers(sessionId) {
        for (let [_, sid] of this.connectedUsers) {
            if (sid === sessionId) return true;
        }
        return false;
    }

    listConnectedSessions(userJid) {
        const userSessions = [];
        for (let [jid, sessionId] of this.connectedUsers) {
            if (jid === userJid) {
                userSessions.push({
                    sessionId: sessionId,
                    connectedAt: this.sessions.get(sessionId)?.connectedAt || Date.now()
                });
            }
        }
        return userSessions;
    }

    listAllConnected() {
        const allConnections = [];
        for (let [userJid, sessionId] of this.connectedUsers) {
            allConnections.push({
                userJid: userJid,
                sessionId: sessionId,
                connectedAt: this.sessions.get(sessionId)?.connectedAt || Date.now()
            });
        }
        return allConnections;
    }

    getSessionByUser(userJid) {
        return this.connectedUsers.get(userJid);
    }
}

module.exports = new SessionManager();

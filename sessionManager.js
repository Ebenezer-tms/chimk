const fs = require('fs');
const path = require('path');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

class SessionManager {
    constructor() {
        this.deployedBots = new Map();
        this.userDeployments = new Map();
        this.sessionDataFile = path.join(__dirname, 'data', 'deployed_bots.json');
        this.loadDeployments();
    }

    loadDeployments() {
        try {
            if (fs.existsSync(this.sessionDataFile)) {
                const data = JSON.parse(fs.readFileSync(this.sessionDataFile, 'utf8'));
                this.userDeployments = new Map(Object.entries(data.userDeployments || {}));
                console.log('✅ Deployed bots data loaded');
            }
        } catch (error) {
            console.error('❌ Error loading deployments:', error);
        }
    }

    saveDeployments() {
        try {
            const data = {
                userDeployments: Object.fromEntries(this.userDeployments),
                timestamp: Date.now()
            };
            
            const dataDir = path.dirname(this.sessionDataFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.sessionDataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Error saving deployments:', error);
        }
    }

    async deployBot(sessionString, userJid, userInfo) {
        console.log('🚀 Starting bot deployment for:', userJid);
        
        // Check user limit
        const userBots = this.userDeployments.get(userJid) || [];
        if (userBots.length >= 10) {
            return { success: false, message: '❌ You can only deploy up to 10 bots' };
        }

        // Validate session string
        if (!sessionString.startsWith('XHYPHER:~')) {
            return { success: false, message: '❌ Session must start with XHYPHER:~' };
        }

        try {
            // Generate deployment ID
            const deploymentId = this.generateDeploymentId();
            
            // Create session directory
            const sessionDir = path.join(__dirname, 'sessions', deploymentId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            // Extract base64 data
            const base64Data = sessionString.substring(9);
            
            console.log('📁 Processing session data...');
            console.log('📏 Base64 length:', base64Data.length);

            try {
                // Decode the base64 data
                const decodedData = Buffer.from(base64Data, 'base64').toString('utf8');
                console.log('✅ Base64 decoded successfully');
                console.log('📄 First 100 chars:', decodedData.substring(0, 100));

                // Parse as JSON to validate
                const sessionData = JSON.parse(decodedData);
                console.log('✅ JSON parsed successfully');

                // Check if this is a valid Baileys session structure
                const isValidSession = this.validateSessionStructure(sessionData);
                
                if (!isValidSession) {
                    console.log('⚠️ Session structure may not be compatible with Baileys');
                }

                // Save the session data as creds.json
                const credsPath = path.join(sessionDir, 'creds.json');
                fs.writeFileSync(credsPath, JSON.stringify(sessionData, null, 2));
                console.log('✅ Session data saved to creds.json');

            } catch (error) {
                console.error('❌ Session processing failed:', error.message);
                return { 
                    success: false, 
                    message: '❌ Invalid session format: ' + error.message 
                };
            }

            // Try to initialize the bot
            console.log('🔗 Attempting to initialize bot...');
            const botSocket = await this.initializeDeployedBot(deploymentId, sessionDir);
            
            if (!botSocket) {
                this.cleanupFailedDeployment(deploymentId, userJid);
                return { 
                    success: false, 
                    message: '❌ Failed to initialize bot with provided session.\n\nPossible reasons:\n• Session is expired\n• Session format is incompatible\n• Network connection issue\n\nTry getting a fresh session ID.' 
                };
            }

            // Store deployment info
            this.deployedBots.set(deploymentId, {
                socket: botSocket,
                userJid: userJid,
                deployedAt: Date.now(),
                sessionDir: sessionDir,
                isActive: false,
                userInfo: userInfo || {}
            });

            // Update user deployments
            userBots.push(deploymentId);
            this.userDeployments.set(userJid, userBots);
            this.saveDeployments();

            return { 
                success: true, 
                message: `✅ Bot deployment initiated!\n\n🔑 Deployment ID: ${deploymentId}\n🤖 Connecting to your account...\n⏰ Please wait for connection confirmation`,
                deploymentId: deploymentId
            };

        } catch (error) {
            console.error('Error deploying bot:', error);
            return { 
                success: false, 
                message: '❌ Deployment failed: ' + error.message 
            };
        }
    }

    validateSessionStructure(sessionData) {
        // Check for common Baileys session properties
        const hasNoiseKey = sessionData.noiseKey !== undefined;
        const hasSignedIdentityKey = sessionData.signedIdentityKey !== undefined;
        const hasSignedPreKey = sessionData.signedPreKey !== undefined;
        const hasRegistrationId = sessionData.registrationId !== undefined;
        
        console.log('🔍 Session structure analysis:');
        console.log('   - noiseKey:', hasNoiseKey);
        console.log('   - signedIdentityKey:', hasSignedIdentityKey);
        console.log('   - signedPreKey:', hasSignedPreKey);
        console.log('   - registrationId:', hasRegistrationId);
        
        return hasNoiseKey && hasSignedIdentityKey && hasSignedPreKey;
    }

    cleanupFailedDeployment(deploymentId, userJid) {
        try {
            // Remove from user deployments
            const userBots = this.userDeployments.get(userJid) || [];
            const updatedBots = userBots.filter(id => id !== deploymentId);
            this.userDeployments.set(userJid, updatedBots);
            
            // Remove session directory
            const sessionDir = path.join(__dirname, 'sessions', deploymentId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }
            
            this.saveDeployments();
        } catch (error) {
            console.error('Error cleaning up failed deployment:', error);
        }
    }

    async initializeDeployedBot(deploymentId, sessionDir) {
        return new Promise(async (resolve) => {
            try {
                console.log(`🔧 Initializing bot ${deploymentId}...`);
                
                let state, saveCreds;
                try {
                    ({ state, saveCreds } = await useMultiFileAuthState(sessionDir));
                    console.log(`✅ Auth state loaded for ${deploymentId}`);
                } catch (authError) {
                    console.error(`❌ Auth state error for ${deploymentId}:`, authError.message);
                    resolve(null);
                    return;
                }

                const { version } = await fetchLatestBaileysVersion();
                console.log(`📡 Using Baileys version: ${version}`);

                const botSocket = makeWASocket({
                    version,
                    logger: { level: 'silent' },
                    printQRInTerminal: false,
                    auth: {
                        creds: state.creds,
                        keys: state.keys,
                    },
                    markOnlineOnConnect: true,
                    connectTimeoutMs: 60000,
                    defaultQueryTimeoutMs: 60000,
                });

                // Set connection timeout
                const connectionTimeout = setTimeout(() => {
                    console.log(`❌ Connection timeout for ${deploymentId}`);
                    try {
                        botSocket.ws.close();
                    } catch (e) {}
                    resolve(null);
                }, 60000);

                // Handle connection events
                botSocket.ev.on('connection.update', (update) => {
                    const { connection, lastDisconnect, qr } = update;
                    
                    console.log(`🔗 ${deploymentId} connection:`, connection);
                    
                    if (connection === 'open') {
                        console.log(`✅ ${deploymentId} connected successfully!`);
                        clearTimeout(connectionTimeout);
                        
                        const botInfo = this.deployedBots.get(deploymentId);
                        if (botInfo) {
                            botInfo.isActive = true;
                        }
                        
                        this.sendDeploymentWelcome(botSocket, deploymentId);
                        resolve(botSocket);
                    } 
                    else if (connection === 'close') {
                        console.log(`❌ ${deploymentId} disconnected`);
                        clearTimeout(connectionTimeout);
                        
                        const statusCode = lastDisconnect?.error?.output?.statusCode;
                        console.log(`📊 Disconnect status code: ${statusCode}`);
                        
                        if (statusCode === 401 || statusCode === 403) {
                            console.log(`🔐 ${deploymentId} - Session revoked`);
                        }
                        
                        resolve(null);
                    }
                    else if (qr) {
                        console.log(`📱 ${deploymentId} requires QR scan - session not valid`);
                        clearTimeout(connectionTimeout);
                        setTimeout(() => {
                            try {
                                botSocket.ws.close();
                            } catch (e) {}
                            resolve(null);
                        }, 3000);
                    }
                });

                botSocket.ev.on('creds.update', saveCreds);

            } catch (error) {
                console.error(`❌ Error initializing ${deploymentId}:`, error.message);
                resolve(null);
            }
        });
    }

    async sendDeploymentWelcome(botSocket, deploymentId) {
        try {
            const botInfo = this.deployedBots.get(deploymentId);
            if (!botInfo || !botSocket.user) return;

            const userNumber = botSocket.user.id.split(':')[0] + '@s.whatsapp.net';
            
            await botSocket.sendMessage(userNumber, {
                text: `🎉 *BOT DEPLOYMENT SUCCESSFUL!*\n\n` +
                      `✅ Your bot is now active on your account\n` +
                      `🔑 Deployment ID: ${deploymentId}\n` +
                      `📱 Connected as: ${botSocket.user.name || 'User'}\n` +
                      `🕒 Connected: ${new Date().toLocaleString()}\n\n` +
                      `✨ All bot features are now available!\n\n` +
                      `Use .help to see all commands`
            });
            
            console.log(`✅ Welcome sent to ${deploymentId}`);
        } catch (error) {
            console.error(`Error sending welcome to ${deploymentId}:`, error);
        }
    }

    stopDeployment(deploymentId, userJid) {
        const deployment = this.deployedBots.get(deploymentId);
        if (!deployment) {
            return { success: false, message: '❌ Deployment not found' };
        }

        if (deployment.userJid !== userJid) {
            return { success: false, message: '❌ You are not the owner of this deployment' };
        }

        try {
            if (deployment.socket) {
                deployment.socket.ws.close();
            }

            this.deployedBots.delete(deploymentId);
            
            const userBots = this.userDeployments.get(userJid) || [];
            const updatedBots = userBots.filter(id => id !== deploymentId);
            this.userDeployments.set(userJid, updatedBots);
            
            // Clean up session directory
            try {
                if (fs.existsSync(deployment.sessionDir)) {
                    fs.rmSync(deployment.sessionDir, { recursive: true, force: true });
                }
            } catch (cleanupError) {
                console.error('Error cleaning session dir:', cleanupError);
            }
            
            this.saveDeployments();

            return { success: true, message: '✅ Bot deployment stopped successfully' };

        } catch (error) {
            console.error('Error stopping deployment:', error);
            return { success: false, message: '❌ Failed to stop deployment' };
        }
    }

    listUserDeployments(userJid) {
        return this.userDeployments.get(userJid) || [];
    }

    listAllDeployments() {
        const allDeployments = [];
        for (let [deploymentId, info] of this.deployedBots) {
            allDeployments.push({
                deploymentId,
                userJid: info.userJid,
                deployedAt: info.deployedAt,
                isActive: info.isActive,
                userInfo: info.userInfo
            });
        }
        return allDeployments;
    }

    getDeploymentStatus(deploymentId) {
        const deployment = this.deployedBots.get(deploymentId);
        if (!deployment) return null;
        
        return {
            deploymentId,
            userJid: deployment.userJid,
            deployedAt: deployment.deployedAt,
            isActive: deployment.isActive,
            uptime: deployment.isActive ? Date.now() - deployment.deployedAt : 0
        };
    }

    getUserDeploymentCount(userJid) {
        const userBots = this.userDeployments.get(userJid) || [];
        return userBots.length;
    }

    generateDeploymentId() {
        return 'BOT_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
}

module.exports = new SessionManager();

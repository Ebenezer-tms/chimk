const fs = require('fs');
const path = require('path');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");

// Import the main bot functionality
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');

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

            // Extract and save session data
            const base64Data = sessionString.substring(9);
            const credsPath = path.join(sessionDir, 'creds.json');
            
            console.log('📁 Saving session data...');
            try {
                const sessionData = Buffer.from(base64Data, 'base64');
                fs.writeFileSync(credsPath, sessionData);
                console.log('✅ Session data saved');
                
                // Verify the session data is valid JSON
                const credsContent = JSON.parse(sessionData.toString());
                if (!credsContent.creds || !credsContent.keys) {
                    throw new Error('Invalid session structure');
                }
            } catch (error) {
                console.error('❌ Session data error:', error);
                return { success: false, message: '❌ Invalid session data. Please check your session ID.' };
            }

            // Deploy the bot with timeout
            console.log('🔗 Initializing bot connection...');
            const botSocket = await this.initializeDeployedBot(deploymentId, sessionDir);
            
            if (!botSocket) {
                return { success: false, message: '❌ Failed to connect. Please check your session ID and try again.' };
            }

            // Store deployment info
            this.deployedBots.set(deploymentId, {
                socket: botSocket,
                userJid: userJid,
                deployedAt: Date.now(),
                sessionDir: sessionDir,
                isActive: false, // Will be set to true when connection opens
                userInfo: userInfo || {},
                connectionAttempts: 1
            });

            // Update user deployments
            userBots.push(deploymentId);
            this.userDeployments.set(userJid, userBots);
            this.saveDeployments();

            return { 
                success: true, 
                message: `✅ Bot deployment started!\n\n🔑 Deployment ID: ${deploymentId}\n🤖 Connecting to your account...\n⏰ This may take a few seconds\n\nYou will receive a confirmation when connected.`,
                deploymentId: deploymentId
            };

        } catch (error) {
            console.error('Error deploying bot:', error);
            return { success: false, message: '❌ Deployment failed: ' + error.message };
        }
    }

    async initializeDeployedBot(deploymentId, sessionDir) {
        return new Promise(async (resolve) => {
            try {
                console.log(`🔧 Initializing bot ${deploymentId}...`);
                
                const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
                const { version } = await fetchLatestBaileysVersion();

                console.log(`📡 Creating socket for ${deploymentId}...`);
                const botSocket = makeWASocket({
                    version,
                    logger: { level: 'error' }, // Only log errors
                    printQRInTerminal: false,
                    auth: {
                        creds: state.creds,
                        keys: state.keys,
                    },
                    markOnlineOnConnect: true,
                    connectTimeoutMs: 30000, // 30 second timeout
                    defaultQueryTimeoutMs: 60000, // 60 second timeout
                });

                // Set connection timeout
                const connectionTimeout = setTimeout(() => {
                    console.log(`❌ Connection timeout for ${deploymentId}`);
                    botSocket.ws.close();
                    resolve(null);
                }, 30000);

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
                            botInfo.connectionAttempts = 0;
                        }
                        
                        // Send welcome message
                        this.sendDeploymentWelcome(botSocket, deploymentId);
                        resolve(botSocket);
                    } 
                    else if (connection === 'close') {
                        console.log(`❌ ${deploymentId} disconnected:`, lastDisconnect?.error);
                        clearTimeout(connectionTimeout);
                        
                        const botInfo = this.deployedBots.get(deploymentId);
                        if (botInfo) {
                            botInfo.isActive = false;
                            botInfo.connectionAttempts = (botInfo.connectionAttempts || 0) + 1;
                            
                            // Auto-reconnect after delay (max 3 attempts)
                            if (botInfo.connectionAttempts <= 3) {
                                setTimeout(() => {
                                    if (this.deployedBots.has(deploymentId)) {
                                        console.log(`🔄 Reconnecting ${deploymentId} (attempt ${botInfo.connectionAttempts})`);
                                        this.reconnectDeployedBot(deploymentId);
                                    }
                                }, 5000 * botInfo.connectionAttempts);
                            }
                        }
                        
                        if (!botSocket.user) {
                            resolve(null);
                        }
                    }
                    else if (qr) {
                        console.log(`📱 ${deploymentId} requires QR scan - session may be invalid`);
                        // QR code means the session is not valid, close connection
                        setTimeout(() => {
                            botSocket.ws.close();
                            resolve(null);
                        }, 2000);
                    }
                });

                botSocket.ev.on('creds.update', saveCreds);

                // Connect to message handlers
                this.setupBotHandlers(botSocket, deploymentId);

            } catch (error) {
                console.error(`❌ Error initializing ${deploymentId}:`, error);
                resolve(null);
            }
        });
    }

    setupBotHandlers(botSocket, deploymentId) {
        // Message handler
        botSocket.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                await handleMessages(botSocket, chatUpdate, false);
            } catch (error) {
                console.error(`Error in ${deploymentId} message handler:`, error);
            }
        });

        // Group participants handler
        botSocket.ev.on('group-participants.update', async (update) => {
            try {
                await handleGroupParticipantUpdate(botSocket, update);
            } catch (error) {
                console.error(`Error in ${deploymentId} group handler:`, error);
            }
        });

        // Status handler
        botSocket.ev.on('messages.upsert', async (chatUpdate) => {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            if (mek.key.remoteJid === 'status@broadcast') {
                try {
                    await handleStatus(botSocket, chatUpdate);
                } catch (error) {
                    console.error(`Error in ${deploymentId} status handler:`, error);
                }
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
                      `✨ *All Features Available:*\n` +
                      `• All commands (.help, .menu, etc.)\n` +
                      `• Group management\n` +
                      `• AI features\n` +
                      `• Games & entertainment\n` +
                      `• Media tools\n\n` +
                      `Use .help to see all commands\n` +
                      `Use .connect list to manage deployments`
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
            
            this.saveDeployments();

            return { success: true, message: '✅ Bot deployment stopped successfully' };

        } catch (error) {
            console.error('Error stopping deployment:', error);
            return { success: false, message: '❌ Failed to stop deployment' };
        }
    }

    async reconnectDeployedBot(deploymentId) {
        try {
            const deployment = this.deployedBots.get(deploymentId);
            if (!deployment) return;

            console.log(`🔄 Reconnecting ${deploymentId}...`);
            const newSocket = await this.initializeDeployedBot(deploymentId, deployment.sessionDir);
            if (newSocket) {
                deployment.socket = newSocket;
                console.log(`✅ Reconnected ${deploymentId}`);
            } else {
                console.log(`❌ Failed to reconnect ${deploymentId}`);
            }
        } catch (error) {
            console.error(`Failed to reconnect ${deploymentId}:`, error);
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
                userInfo: info.userInfo,
                connectionAttempts: info.connectionAttempts || 0
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
            connectionAttempts: deployment.connectionAttempts || 0,
            uptime: deployment.isActive ? Date.now() - deployment.deployedAt : 0
        };
    }

    getUserDeploymentCount(userJid) {
        const userBots = this.userDeployments.get(userJid) || [];
        return userBots.length;
    }

    generateDeploymentId() {
        return 'DEPLOY_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
}

module.exports = new SessionManager();

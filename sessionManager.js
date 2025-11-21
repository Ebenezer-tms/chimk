const fs = require('fs');
const path = require('path');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

// Import the main bot functionality
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');

class SessionManager {
    constructor() {
        this.deployedBots = new Map(); // sessionId -> { socket, userJid, deployedAt }
        this.userDeployments = new Map(); // userJid -> array of deployed sessionIds
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
        console.log('🚀 Deploying bot for user:', userJid);
        
        // Check if user already has 10 deployments
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
            const base64Data = sessionString.substring(9); // Remove "XHYPHER:~"
            const credsPath = path.join(sessionDir, 'creds.json');
            
            try {
                const sessionData = Buffer.from(base64Data, 'base64');
                fs.writeFileSync(credsPath, sessionData);
                console.log('✅ Session data saved for deployment:', deploymentId);
            } catch (error) {
                console.error('❌ Base64 decode error:', error);
                return { success: false, message: '❌ Invalid session data format' };
            }

            // Deploy the bot
            const botSocket = await this.initializeDeployedBot(deploymentId, sessionDir);
            
            if (!botSocket) {
                return { success: false, message: '❌ Failed to deploy bot - connection failed' };
            }

            // Store deployment info
            this.deployedBots.set(deploymentId, {
                socket: botSocket,
                userJid: userJid,
                deployedAt: Date.now(),
                sessionDir: sessionDir,
                isActive: true,
                userInfo: userInfo || {}
            });

            // Update user deployments
            userBots.push(deploymentId);
            this.userDeployments.set(userJid, userBots);
            this.saveDeployments();

            return { 
                success: true, 
                message: `✅ Bot deployed successfully to your account!\n\n🔑 Deployment ID: ${deploymentId}\n🤖 Your bot is now active and running\n📱 You can use all bot features on your account`,
                deploymentId: deploymentId
            };

        } catch (error) {
            console.error('Error deploying bot:', error);
            return { success: false, message: '❌ Failed to deploy bot: ' + error.message };
        }
    }

    async initializeDeployedBot(deploymentId, sessionDir) {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            const { version } = await fetchLatestBaileysVersion();

            const botSocket = makeWASocket({
                version,
                logger: { level: 'silent' },
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: state.keys,
                },
                markOnlineOnConnect: true,
            });

            // Handle connection events for deployed bot
            botSocket.ev.on('connection.update', (update) => {
                const { connection } = update;
                console.log(`🔗 Deployed bot ${deploymentId} connection:`, connection);
                
                if (connection === 'close') {
                    console.log(`❌ Deployed bot ${deploymentId} disconnected`);
                    const botInfo = this.deployedBots.get(deploymentId);
                    if (botInfo) {
                        botInfo.isActive = false;
                    }
                    
                    // Auto-reconnect after 10 seconds
                    setTimeout(() => {
                        if (this.deployedBots.has(deploymentId)) {
                            console.log(`🔄 Reconnecting deployed bot ${deploymentId}`);
                            this.reconnectDeployedBot(deploymentId);
                        }
                    }, 10000);
                } else if (connection === 'open') {
                    console.log(`✅ Deployed bot ${deploymentId} connected successfully`);
                    const botInfo = this.deployedBots.get(deploymentId);
                    if (botInfo) {
                        botInfo.isActive = true;
                    }
                    
                    // Send welcome message to the user
                    this.sendDeploymentWelcome(botSocket, deploymentId);
                }
            });

            botSocket.ev.on('creds.update', saveCreds);

            // IMPORTANT: Connect the deployed bot to the same message handlers
            botSocket.ev.on('messages.upsert', async (chatUpdate) => {
                try {
                    await handleMessages(botSocket, chatUpdate, false);
                } catch (error) {
                    console.error(`Error in deployed bot ${deploymentId} message handler:`, error);
                }
            });

            // Handle group events for deployed bot
            botSocket.ev.on('group-participants.update', async (update) => {
                try {
                    await handleGroupParticipantUpdate(botSocket, update);
                } catch (error) {
                    console.error(`Error in deployed bot ${deploymentId} group handler:`, error);
                }
            });

            // Handle status updates for deployed bot
            botSocket.ev.on('messages.upsert', async (chatUpdate) => {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                if (mek.key.remoteJid === 'status@broadcast') {
                    try {
                        await handleStatus(botSocket, chatUpdate);
                    } catch (error) {
                        console.error(`Error in deployed bot ${deploymentId} status handler:`, error);
                    }
                }
            });

            return botSocket;

        } catch (error) {
            console.error(`Error initializing deployed bot ${deploymentId}:`, error);
            return null;
        }
    }

    async sendDeploymentWelcome(botSocket, deploymentId) {
        try {
            const botInfo = this.deployedBots.get(deploymentId);
            if (!botInfo || !botSocket.user) return;

            const userNumber = botSocket.user.id.split(':')[0] + '@s.whatsapp.net';
            
            await botSocket.sendMessage(userNumber, {
                text: `🎉 *YOUR BOT IS NOW ACTIVE!*\n\n` +
                      `✅ Successfully deployed to your account\n` +
                      `🔑 Deployment ID: ${deploymentId}\n` +
                      `🕒 Deployed: ${new Date().toLocaleString()}\n` +
                      `📱 You now have the full bot functionality!\n\n` +
                      `Use .help to see all available commands\n` +
                      `Use .connect list to manage your deployments`
            });
            
            console.log(`✅ Welcome sent to deployed bot ${deploymentId}`);
        } catch (error) {
            console.error(`Error sending welcome to deployed bot ${deploymentId}:`, error);
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
            // Close the socket
            if (deployment.socket) {
                deployment.socket.ws.close();
            }

            // Remove from maps
            this.deployedBots.delete(deploymentId);
            
            // Remove from user deployments
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

            const newSocket = await this.initializeDeployedBot(deploymentId, deployment.sessionDir);
            if (newSocket) {
                deployment.socket = newSocket;
                console.log(`✅ Reconnected deployed bot ${deploymentId}`);
            }
        } catch (error) {
            console.error(`Failed to reconnect deployed bot ${deploymentId}:`, error);
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
        return 'DEPLOY_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Check if a deployment is active
    isDeploymentActive(deploymentId) {
        const deployment = this.deployedBots.get(deploymentId);
        return deployment ? deployment.isActive : false;
    }
}

module.exports = new SessionManager();

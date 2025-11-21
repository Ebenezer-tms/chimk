const fs = require('fs');
const path = require('path');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, default: makeWASocket } = require("@whiskeysockets/baileys");

class DeployManager {
    constructor() {
        this.deployedBots = new Map();
        this.userDeployments = new Map();
        this.deploymentDataFile = path.join(__dirname, 'data', 'deployments.json');
        this.loadDeployments();
    }

    loadDeployments() {
        try {
            if (fs.existsSync(this.deploymentDataFile)) {
                const data = JSON.parse(fs.readFileSync(this.deploymentDataFile, 'utf8'));
                this.userDeployments = new Map(Object.entries(data.userDeployments || {}));
                console.log('✅ Deployments loaded');
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
            
            const dataDir = path.dirname(this.deploymentDataFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.deploymentDataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Error saving deployments:', error);
        }
    }

    async deployBot(sessionString, userJid, userInfo) {
        console.log('🚀 Starting deployment for:', userJid);
        
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
            
            try {
                // Decode the base64 data
                const decodedData = Buffer.from(base64Data, 'base64').toString('utf8');
                console.log('✅ Base64 decoded successfully');
                
                // Parse as JSON
                const sessionData = JSON.parse(decodedData);
                console.log('✅ JSON parsed successfully');
                
                // Convert the session data to Baileys format
                const baileysSession = this.convertToBaileysFormat(sessionData);
                
                // Save as creds.json
                const credsPath = path.join(sessionDir, 'creds.json');
                fs.writeFileSync(credsPath, JSON.stringify(baileysSession, null, 2));
                console.log('✅ Session converted and saved');

            } catch (error) {
                console.error('❌ Session processing failed:', error.message);
                return { 
                    success: false, 
                    message: '❌ Invalid session format. Please get a fresh session ID.' 
                };
            }

            // Initialize the bot
            console.log('🔗 Initializing bot connection...');
            const botResult = await this.initializeBot(deploymentId, sessionDir);
            
            if (!botResult.success) {
                this.cleanupFailedDeployment(deploymentId, userJid);
                return botResult;
            }

            // Store deployment info
            this.deployedBots.set(deploymentId, {
                socket: botResult.socket,
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
                message: `✅ Bot deployed successfully!\n\n🔑 Deployment ID: ${deploymentId}\n🤖 Your bot is now active on your account\n📱 You can use all bot features!`,
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

    convertToBaileysFormat(sessionData) {
        // Convert the session data to Baileys-compatible format
        const baileysSession = {
            noiseKey: sessionData.noiseKey ? { private: Buffer.from(sessionData.noiseKey.private, 'base64'), public: Buffer.from(sessionData.noiseKey.public, 'base64') } : undefined,
            signedIdentityKey: sessionData.signedIdentityKey ? { private: Buffer.from(sessionData.signedIdentityKey.private, 'base64'), public: Buffer.from(sessionData.signedIdentityKey.public, 'base64') } : undefined,
            signedPreKey: sessionData.signedPreKey ? {
                keyId: sessionData.signedPreKey.keyId,
                keyPair: {
                    private: Buffer.from(sessionData.signedPreKey.keyPair.private, 'base64'),
                    public: Buffer.from(sessionData.signedPreKey.keyPair.public, 'base64')
                },
                signature: Buffer.from(sessionData.signedPreKey.signature, 'base64')
            } : undefined,
            registrationId: sessionData.registrationId || 0,
            advSecretKey: sessionData.advSecretKey ? Buffer.from(sessionData.advSecretKey, 'base64') : undefined,
            processedHistoryMessages: sessionData.processedHistoryMessages || [],
            nextPreKeyId: sessionData.nextPreKeyId || 1,
            firstUnuploadedPreKeyId: sessionData.firstUnuploadedPreKeyId || 1,
            accountSettings: sessionData.accountSettings || { unarchiveChats: false },
            registered: sessionData.registered !== undefined ? sessionData.registered : false,
            pairingCode: sessionData.pairingCode || null,
            me: sessionData.me || null,
            account: sessionData.account || null,
            signalIdentities: sessionData.signalIdentities || [],
            platform: sessionData.platform || 'android',
            routingInfo: sessionData.routingInfo ? Buffer.from(sessionData.routingInfo, 'base64') : Buffer.alloc(0),
            lastAccountSyncTimestamp: sessionData.lastAccountSyncTimestamp || 0,
            myAppStateKeyId: sessionData.myAppStateKeyId || 'AAAAAA'
        };

        console.log('✅ Session converted to Baileys format');
        return baileysSession;
    }

    async initializeBot(deploymentId, sessionDir) {
        return new Promise(async (resolve) => {
            let botSocket;
            
            try {
                console.log(`🔧 Initializing bot ${deploymentId}...`);
                
                let state, saveCreds;
                try {
                    ({ state, saveCreds } = await useMultiFileAuthState(sessionDir));
                    console.log(`✅ Auth state loaded for ${deploymentId}`);
                } catch (authError) {
                    console.error(`❌ Auth state error:`, authError.message);
                    resolve({ 
                        success: false, 
                        message: '❌ Session authentication failed. Please use a fresh session ID.' 
                    });
                    return;
                }

                const { version, isLatest } = await fetchLatestBaileysVersion();
                console.log(`📱 Using WA v${version.join('.')}, isLatest: ${isLatest}`);

                // Create socket with better configuration
                botSocket = makeWASocket({
                    version,
                    logger: { level: 'silent' },
                    printQRInTerminal: false,
                    auth: {
                        creds: state.creds,
                        keys: state.keys,
                    },
                    browser: ['Chrome', 'Windows', '10.0.0'],
                    markOnlineOnConnect: false, // Changed to false for better stability
                    generateHighQualityLinkPreview: true,
                    syncFullHistory: false,
                    connectTimeoutMs: 60000,
                    keepAliveIntervalMs: 30000,
                    retryRequestDelayMs: 1000,
                    maxMsgRetryCount: 3,
                    fireInitQueries: true,
                    emitOwnEvents: true,
                    defaultQueryTimeoutMs: 60000,
                    transactionOpts: {
                        maxCommitRetries: 3,
                        delayBetweenTriesMs: 3000
                    }
                });

                let connectionEstablished = false;

                // Set connection timeout
                const connectionTimeout = setTimeout(() => {
                    if (!connectionEstablished) {
                        console.log(`❌ Connection timeout for ${deploymentId}`);
                        try {
                            if (botSocket && botSocket.ws) {
                                botSocket.ws.close();
                            }
                        } catch (e) {
                            console.error('Error closing socket:', e);
                        }
                        resolve({ 
                            success: false, 
                            message: '❌ Connection timeout. Please check your session ID and try again.' 
                        });
                    }
                }, 60000);

                // Handle connection events
                botSocket.ev.on('connection.update', (update) => {
                    const { connection, lastDisconnect, qr, isNewLogin, receivedPendingNotifications } = update;
                    
                    console.log(`🔗 ${deploymentId} connection update:`, connection, qr ? 'QR Received' : '', isNewLogin ? 'New Login' : '');
                    
                    if (connection === 'open') {
                        console.log(`✅ ${deploymentId} connected successfully!`);
                        connectionEstablished = true;
                        clearTimeout(connectionTimeout);
                        
                        // Send welcome message
                        this.sendDeploymentWelcome(botSocket, deploymentId);
                        resolve({ success: true, socket: botSocket });
                    } 
                    else if (connection === 'close') {
                        console.log(`❌ ${deploymentId} disconnected`);
                        const statusCode = lastDisconnect?.error?.output?.statusCode;
                        const error = lastDisconnect?.error;
                        
                        console.log(`📊 Disconnect details - Status: ${statusCode}, Error: ${error?.message}`);
                        
                        if (!connectionEstablished) {
                            clearTimeout(connectionTimeout);
                            let errorMsg = '❌ Connection failed. ';
                            
                            if (statusCode === 401) {
                                errorMsg += 'Session revoked or expired. Please get a new session ID.';
                            } else if (statusCode === 403) {
                                errorMsg += 'Session banned or blocked. Please use a different account.';
                            } else if (statusCode === 400) {
                                errorMsg += 'Bad request. Invalid session data.';
                            } else if (statusCode === 429) {
                                errorMsg += 'Too many attempts. Please try again later.';
                            } else if (statusCode === 503) {
                                errorMsg += 'Service unavailable. WhatsApp servers are down.';
                            } else {
                                errorMsg += `Please check your session ID and try again. (Error: ${error?.message || 'Unknown'})`;
                            }
                            
                            resolve({ success: false, message: errorMsg });
                        }
                    }
                    else if (qr) {
                        console.log(`📱 ${deploymentId} requires QR scan`);
                        if (!connectionEstablished) {
                            clearTimeout(connectionTimeout);
                            resolve({ 
                                success: false, 
                                message: '❌ Session requires QR authentication. Please use a fully authenticated session ID.' 
                            });
                        }
                    }
                    else if (connection === 'connecting') {
                        console.log(`🔄 ${deploymentId} is connecting...`);
                    }
                });

                // Handle credentials updates
                botSocket.ev.on('creds.update', saveCreds);

                // Handle other important events
                botSocket.ev.on('messages.upsert', (m) => {
                    if (m.type === 'notify') {
                        console.log(`💬 ${deploymentId} received message`);
                    }
                });

            } catch (error) {
                console.error(`❌ Error initializing ${deploymentId}:`, error.message);
                resolve({ 
                    success: false, 
                    message: '❌ Bot initialization failed: ' + error.message 
                });
            }
        });
    }

    async sendDeploymentWelcome(botSocket, deploymentId) {
        try {
            // Wait a bit for connection to stabilize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (!botSocket.user) {
                console.log(`❌ No user object found for ${deploymentId}`);
                return;
            }

            const userNumber = botSocket.user.id.split(':')[0] + '@s.whatsapp.net';
            
            await botSocket.sendMessage(userNumber, {
                text: `🎉 *BOT DEPLOYMENT SUCCESSFUL!*\n\n` +
                      `✅ Your bot is now active on your account\n` +
                      `🔑 Deployment ID: ${deploymentId}\n` +
                      `📱 Connected as: ${botSocket.user.name || 'User'}\n` +
                      `🕒 Connected: ${new Date().toLocaleString()}\n\n` +
                      `✨ *All bot features are now available!*\n\n` +
                      `Use .help to see all commands\n` +
                      `Use .connect list to manage deployments`
            });
            
            console.log(`✅ Welcome sent to ${deploymentId}`);
        } catch (error) {
            console.error(`Error sending welcome to ${deploymentId}:`, error.message);
        }
    }

    cleanupFailedDeployment(deploymentId, userJid) {
        try {
            const userBots = this.userDeployments.get(userJid) || [];
            const updatedBots = userBots.filter(id => id !== deploymentId);
            this.userDeployments.set(userJid, updatedBots);
            
            const sessionDir = path.join(__dirname, 'sessions', deploymentId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }
            
            this.saveDeployments();
            console.log(`🧹 Cleaned up failed deployment: ${deploymentId}`);
        } catch (error) {
            console.error('Error cleaning up:', error);
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
            if (deployment.socket && deployment.socket.ws) {
                deployment.socket.ws.close();
                console.log(`🔌 Closed WebSocket for ${deploymentId}`);
            }

            this.deployedBots.delete(deploymentId);
            
            const userBots = this.userDeployments.get(userJid) || [];
            const updatedBots = userBots.filter(id => id !== deploymentId);
            this.userDeployments.set(userJid, updatedBots);
            
            // Clean up session directory
            try {
                if (fs.existsSync(deployment.sessionDir)) {
                    fs.rmSync(deployment.sessionDir, { recursive: true, force: true });
                    console.log(`🗑️ Removed session directory for ${deploymentId}`);
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

module.exports = new DeployManager();

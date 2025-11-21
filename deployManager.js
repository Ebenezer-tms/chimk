const fs = require('fs');
const path = require('path');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const logger = require('./logger');

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
                logger.info('Deployments loaded successfully');
            }
        } catch (error) {
            logger.error({ error }, 'Error loading deployments');
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
            logger.debug('Deployments saved successfully');
        } catch (error) {
            logger.error({ error }, 'Error saving deployments');
        }
    }

    async deployBot(sessionString, userJid, userInfo) {
        logger.info({ userJid }, 'Starting bot deployment');
        
        // Check user limit
        const userBots = this.userDeployments.get(userJid) || [];
        if (userBots.length >= 10) {
            logger.warn({ userJid, currentCount: userBots.length }, 'User reached deployment limit');
            return { success: false, message: '❌ You can only deploy up to 10 bots' };
        }

        // Validate session string
        if (!sessionString.startsWith('XHYPHER:~')) {
            logger.warn({ userJid }, 'Invalid session format - missing XHYPHER prefix');
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
            
            logger.debug('Processing session data');
            
            try {
                // Decode the base64 data
                const decodedData = Buffer.from(base64Data, 'base64').toString('utf8');
                logger.debug('Base64 decoded successfully');
                
                // Parse as JSON
                const sessionData = JSON.parse(decodedData);
                logger.debug('JSON parsed successfully');
                
                // Convert the session data to Baileys format
                const baileysSession = this.convertToBaileysFormat(sessionData);
                
                // Save as creds.json
                const credsPath = path.join(sessionDir, 'creds.json');
                fs.writeFileSync(credsPath, JSON.stringify(baileysSession, null, 2));
                logger.debug('Session converted and saved');

            } catch (error) {
                logger.error({ error, userJid }, 'Session processing failed');
                return { 
                    success: false, 
                    message: '❌ Invalid session format. Please get a fresh session ID.' 
                };
            }

            // Initialize the bot
            logger.debug({ deploymentId }, 'Initializing bot connection');
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

            logger.info({ deploymentId, userJid }, 'Bot deployed successfully');

            return { 
                success: true, 
                message: `✅ Bot deployed successfully!\n\n🔑 Deployment ID: ${deploymentId}\n🤖 Your bot is now active on your account\n📱 You can use all bot features!`,
                deploymentId: deploymentId
            };

        } catch (error) {
            logger.error({ error, userJid }, 'Bot deployment failed');
            return { 
                success: false, 
                message: '❌ Deployment failed: ' + error.message 
            };
        }
    }

    convertToBaileysFormat(sessionData) {
        // Convert the session data to Baileys-compatible format
        const baileysSession = {
            creds: {
                noiseKey: sessionData.noiseKey,
                signedIdentityKey: sessionData.signedIdentityKey,
                signedPreKey: sessionData.signedPreKey,
                registrationId: sessionData.registrationId,
                advSecretKey: sessionData.advSecretKey,
                processedHistoryMessages: sessionData.processedHistoryMessages || [],
                nextPreKeyId: sessionData.nextPreKeyId || 1,
                firstUnuploadedPreKeyId: sessionData.firstUnuploadedPreKeyId || 1,
                accountSettings: sessionData.accountSettings || { unarchiveChats: false },
                registered: sessionData.registered !== undefined ? sessionData.registered : true,
                pairingCode: sessionData.pairingCode || null,
                me: sessionData.me || null,
                account: sessionData.account || null,
                signalIdentities: sessionData.signalIdentities || [],
                platform: sessionData.platform || 'android',
                routingInfo: sessionData.routingInfo || Buffer.from([]),
                lastAccountSyncTimestamp: sessionData.lastAccountSyncTimestamp || Date.now(),
                myAppStateKeyId: sessionData.myAppStateKeyId || 'AAAAAAI1t'
            },
            keys: {}
        };

        logger.debug('Session converted to Baileys format');
        return baileysSession;
    }

    async initializeBot(deploymentId, sessionDir) {
        return new Promise(async (resolve) => {
            try {
                logger.debug({ deploymentId }, 'Initializing bot');
                
                let state, saveCreds;
                try {
                    ({ state, saveCreds } = await useMultiFileAuthState(sessionDir));
                    logger.debug({ deploymentId }, 'Auth state loaded');
                } catch (authError) {
                    logger.error({ deploymentId, error: authError }, 'Auth state error');
                    resolve({ 
                        success: false, 
                        message: '❌ Session authentication failed. Please use a fresh session ID.' 
                    });
                    return;
                }

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
                    connectTimeoutMs: 30000,
                });

                let connectionEstablished = false;

                // Set connection timeout
                const connectionTimeout = setTimeout(() => {
                    if (!connectionEstablished) {
                        logger.warn({ deploymentId }, 'Connection timeout');
                        try {
                            botSocket.ws.close();
                        } catch (e) {}
                        resolve({ 
                            success: false, 
                            message: '❌ Connection timeout. Please check your session ID and try again.' 
                        });
                    }
                }, 30000);

                // Handle connection events
                botSocket.ev.on('connection.update', (update) => {
                    const { connection, lastDisconnect, qr } = update;
                    
                    logger.debug({ deploymentId, connection }, 'Connection update');
                    
                    if (connection === 'open') {
                        logger.info({ deploymentId }, 'Bot connected successfully');
                        connectionEstablished = true;
                        clearTimeout(connectionTimeout);
                        
                        // Send welcome message
                        this.sendDeploymentWelcome(botSocket, deploymentId);
                        resolve({ success: true, socket: botSocket });
                    } 
                    else if (connection === 'close') {
                        logger.warn({ deploymentId }, 'Bot disconnected');
                        if (!connectionEstablished) {
                            clearTimeout(connectionTimeout);
                            const statusCode = lastDisconnect?.error?.output?.statusCode;
                            let errorMsg = '❌ Connection failed. ';
                            
                            if (statusCode === 401) {
                                errorMsg += 'Session revoked or expired.';
                            } else if (statusCode === 403) {
                                errorMsg += 'Session banned or blocked.';
                            } else {
                                errorMsg += 'Please check your session ID.';
                            }
                            
                            resolve({ success: false, message: errorMsg });
                        }
                    }
                    else if (qr) {
                        logger.debug({ deploymentId }, 'QR scan required');
                        if (!connectionEstablished) {
                            clearTimeout(connectionTimeout);
                            resolve({ 
                                success: false, 
                                message: '❌ Session requires QR authentication. Please use a fully authenticated session ID.' 
                            });
                        }
                    }
                });

                botSocket.ev.on('creds.update', saveCreds);

            } catch (error) {
                logger.error({ deploymentId, error }, 'Bot initialization failed');
                resolve({ 
                    success: false, 
                    message: '❌ Bot initialization failed: ' + error.message 
                });
            }
        });
    }

    async sendDeploymentWelcome(botSocket, deploymentId) {
        try {
            if (!botSocket.user) return;

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
            
            logger.debug({ deploymentId }, 'Welcome message sent');
        } catch (error) {
            logger.error({ deploymentId, error }, 'Error sending welcome message');
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
            logger.debug({ deploymentId, userJid }, 'Cleaned up failed deployment');
        } catch (error) {
            logger.error({ deploymentId, error }, 'Error cleaning up failed deployment');
        }
    }

    stopDeployment(deploymentId, userJid) {
        const deployment = this.deployedBots.get(deploymentId);
        if (!deployment) {
            logger.warn({ deploymentId, userJid }, 'Deployment not found for stop');
            return { success: false, message: '❌ Deployment not found' };
        }

        if (deployment.userJid !== userJid) {
            logger.warn({ deploymentId, userJid, actualOwner: deployment.userJid }, 'Unauthorized stop attempt');
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
                logger.error({ deploymentId, error: cleanupError }, 'Error cleaning session directory');
            }
            
            this.saveDeployments();

            logger.info({ deploymentId, userJid }, 'Deployment stopped successfully');
            return { success: true, message: '✅ Bot deployment stopped successfully' };

        } catch (error) {
            logger.error({ deploymentId, error }, 'Error stopping deployment');
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

// commands/menuConfig.js


const { 
    setMenuStyle, 
    getMenuSettings, 
    toggleSetting, 
    MENU_STYLES,
    resetMenuSettings,
    updateMenuSettings
} = require('./menuSettings');

async function menuConfigCommand(sock, chatId, message, args) {
    const pushname = message.pushName || "Unknown User";
    
    if (args.length === 0) {
        // Show current settings
        const settings = getMenuSettings();
        let configMessage = `┏❐ ❴《 😍PRETTY-MD😍 》❵ ❐\n`;
        configMessage += `├◆ *Current Style:* ${settings.menuStyle} (${MENU_STYLES[settings.menuStyle]})\n`;
        configMessage += `├◆ *Show Memory:* ${settings.showMemory ? '✅' : '❌'}\n`;
        configMessage += `├◆ *Show Uptime:* ${settings.showUptime ? '✅' : '❌'}\n`;
        configMessage += `├◆ *Show Progress Bar:* ${settings.showProgressBar ? '✅' : '❌'}\n`;
        configMessage += `┗❐\n`;
        configMessage += `\n\n`;
        
        configMessage += `*Available Styles:*\n`;
        for (const [style, description] of Object.entries(MENU_STYLES)) {
            configMessage += `• ${style}: ${description}\n`;
        }
        
        configMessage += `\n*Usage:*\n`;
        configMessage += `• .setmenu style <1-6> - Change menu style\n`;
        configMessage += `• .setmenu toggle <setting> - Toggle settings\n`;
        configMessage += `• .menuconfig reset - Reset to default\n`;
        configMessage += `• .menuconfig preview - Preview current style\n`;
        
        await sock.sendMessage(chatId, { text: configMessage }, { quoted: message });
        return;
    }
    
    const action = args[0].toLowerCase();
    
    try {
        switch (action) {
            case 'style':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: 'Please specify a style number (1-6)' 
                    }, { quoted: message });
                    return;
                }
                
                const newStyle = args[1];
                if (setMenuStyle(newStyle)) {
                    await sock.sendMessage(chatId, { 
                        text: `✅ Menu style changed to ${newStyle} (${MENU_STYLES[newStyle]})` 
                    }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, { 
                        text: '❌ Invalid style number. Use 1-6.' 
                    }, { quoted: message });
                }
                break;
                
            case 'toggle':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: 'Please specify a setting to toggle (memory/uptime/progress)' 
                    }, { quoted: message });
                    return;
                }
                
                const settingMap = {
                    'memory': 'showMemory',
                    'uptime': 'showUptime', 
                    'progress': 'showProgressBar'
                };
                
                const settingKey = settingMap[args[1].toLowerCase()];
                if (!settingKey) {
                    await sock.sendMessage(chatId, { 
                        text: '❌ Invalid setting. Use: memory, uptime, or progress' 
                    }, { quoted: message });
                    return;
                }
                
                const newValue = toggleSetting(settingKey);
                await sock.sendMessage(chatId, { 
                    text: `✅ ${args[1]} setting ${newValue ? 'enabled' : 'disabled'}` 
                }, { quoted: message });
                break;
                
            case 'reset':
                resetMenuSettings();
                await sock.sendMessage(chatId, { 
                    text: '✅ Menu settings reset to default' 
                }, { quoted: message });
                break;
                
            case 'preview':
                // Trigger help command to preview current style
                const helpCommand = require('./help');
                await helpCommand(sock, chatId, message);
                break;
                
            case 'set':
                if (args.length < 3) {
                    await sock.sendMessage(chatId, { 
                        text: 'Usage: .menuconfig set <setting> <value>\nSettings: memory, uptime, progress\nValues: on/off' 
                    }, { quoted: message });
                    return;
                }
                
                const setSettingMap = {
                    'memory': 'showMemory',
                    'uptime': 'showUptime', 
                    'progress': 'showProgressBar'
                };
                
                const setSettingKey = setSettingMap[args[1].toLowerCase()];
                if (!setSettingKey) {
                    await sock.sendMessage(chatId, { 
                        text: '❌ Invalid setting. Use: memory, uptime, or progress' 
                    }, { quoted: message });
                    return;
                }
                
                const value = args[2].toLowerCase();
                if (value !== 'on' && value !== 'off') {
                    await sock.sendMessage(chatId, { 
                        text: '❌ Invalid value. Use: on or off' 
                    }, { quoted: message });
                    return;
                }
                
                const settingsUpdate = { [setSettingKey]: value === 'on' };
                updateMenuSettings(settingsUpdate);
                await sock.sendMessage(chatId, { 
                    text: `✅ ${args[1]} setting ${value === 'on' ? 'enabled' : 'disabled'}` 
                }, { quoted: message });
                break;
                
            default:
                await sock.sendMessage(chatId, { 
                    text: '❌ Unknown action. Use: style, toggle, reset, set, or preview' 
                }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in menu config:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error configuring menu settings' 
        }, { quoted: message });
    }
}

module.exports = menuConfigCommand;

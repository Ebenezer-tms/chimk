const dataManager = require('./dataManager');

class SettingsManager {
    constructor() {
        this.settings = dataManager.loadFile('settings.json', this.getDefaultSettings());
        this.saveSettings(); // Ensure file exists
    }

    getDefaultSettings() {
        return {
            prefix: '.',
            mode: 'public',
            chatbot: {
                enabled: false
            },
            features: {
                autotyping: false,
                autoread: false,
                antilink: false,
                antitag: false,
                antibadword: false,
                welcome: false,
                goodbye: false,
                anticall: false,
                pmblocker: false
            },
            groups: {},
            users: {}
        };
    }

    getSetting(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this.settings;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        return value !== undefined ? value : defaultValue;
    }

    setSetting(key, value) {
        const keys = key.split('.');
        let current = this.settings;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in current) || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
        return this.saveSettings();
    }

    saveSettings() {
        return dataManager.autoSave('settings.json', this.settings, true);
    }

    // Group-specific settings
    getGroupSetting(groupId, key, defaultValue = null) {
        const groupSettings = this.settings.groups[groupId] || {};
        return key in groupSettings ? groupSettings[key] : defaultValue;
    }

    setGroupSetting(groupId, key, value) {
        if (!this.settings.groups[groupId]) {
            this.settings.groups[groupId] = {};
        }
        this.settings.groups[groupId][key] = value;
        return this.saveSettings();
    }
}

module.exports = new SettingsManager();

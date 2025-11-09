const fs = require('fs');
const path = require('path');

class DataManager {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
            console.log('✅ Created data directory');
        }
    }

    // Generic save function
    saveFile(filename, data) {
        try {
            const filePath = path.join(this.dataDir, filename);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`❌ Error saving ${filename}:`, error);
            return false;
        }
    }

    // Generic load function
    loadFile(filename, defaultData = {}) {
        try {
            const filePath = path.join(this.dataDir, filename);
            if (!fs.existsSync(filePath)) {
                this.saveFile(filename, defaultData);
                return defaultData;
            }
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`❌ Error loading ${filename}:`, error);
            return defaultData;
        }
    }

    // Auto-save with backup
    autoSave(filename, data, backup = false) {
        if (backup) {
            const backupFile = `${filename}.backup`;
            this.saveFile(backupFile, data);
        }
        return this.saveFile(filename, data);
    }
}

module.exports = new DataManager();

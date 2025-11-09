const fs = require('fs');
const path = require('path');
const dataManager = require('./dataManager');

class BackupManager {
    constructor() {
        this.backupDir = path.join(__dirname, '../backups');
        this.ensureBackupDir();
    }

    ensureBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const dataDir = path.join(__dirname, '../data');
            const backupFile = path.join(this.backupDir, `backup-${timestamp}.zip`);
            
            // Copy all data files to backup directory
            const files = fs.readdirSync(dataDir);
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    const source = path.join(dataDir, file);
                    const dest = path.join(this.backupDir, `${timestamp}-${file}`);
                    fs.copyFileSync(source, dest);
                }
            });
            
            console.log(`✅ Backup created: ${backupFile}`);
            return true;
        } catch (error) {
            console.error('❌ Backup failed:', error);
            return false;
        }
    }
}

module.exports = new BackupManager();

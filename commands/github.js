const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

class GitHubCommand {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
        this.repoUrl = 'https://api.github.com/repos/superstar-zimtk/Pretty-md';
        this.defaultImage = path.join(__dirname, '../assets/june_repos.jpg');
        this.fallbackImage = path.join(__dirname, '../assets/fallback.jpg');
    }

    async validateImagePath(imgPath) {
        try {
            await access(imgPath);
            return true;
        } catch {
            return false;
        }
    }

    async fetchWithRetry(url, retries = 3, backoff = 300) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Pretty-MD-Bot',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    timeout: 10000
                });

                if (response.status === 403) {
                    const resetTime = response.headers.get('x-ratelimit-reset');
                    if (resetTime) {
                        const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000;
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
            }
        }
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    generateProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    async getRepoStatistics() {
        const now = Date.now();
        const cached = this.cache.get('repo_data');

        if (cached && (now - cached.timestamp < this.cacheTimeout)) {
            return cached.data;
        }

        try {
            const [repoData, contributors, languages] = await Promise.all([
                this.fetchWithRetry(this.repoUrl),
                this.fetchWithRetry(this.repoUrl + '/contributors'),
                this.fetchWithRetry(this.repoUrl + '/languages')
            ]);

            // Additional API calls for more insights
            const [releases, commits] = await Promise.allSettled([
                this.fetchWithRetry(this.repoUrl + '/releases'),
                this.fetchWithRetry(this.repoUrl + '/commits?per_page=1')
            ]);

            const data = {
                ...repoData,
                contributors_count: contributors.length,
                top_languages: Object.entries(languages)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([lang, bytes]) => ({ lang, bytes })),
                release_count: releases.status === 'fulfilled' ? releases.value.length : 0,
                last_commit: commits.status === 'fulfilled' && commits.value[0] ? 
                    commits.value[0].commit.committer.date : null
            };

            this.cache.set('repo_data', {
                data,
                timestamp: now
            });

            return data;
        } catch (error) {
            // Return cached data if available, even if expired
            if (cached) return cached.data;
            throw error;
        }
    }

    createAdvancedMessage(json) {
        const lastUpdate = moment(json.updated_at);
        const created = moment(json.created_at);
        const now = moment();
        const daysSinceUpdate = now.diff(lastUpdate, 'days');
        const repoAge = now.diff(created, 'days');

        // Calculate activity score based on various metrics
        const activityScore = Math.min(100, 
            (json.stargazers_count * 0.3) + 
            (json.forks_count * 0.4) + 
            (json.watchers_count * 0.2) + 
            (daysSinceUpdate < 7 ? 30 : daysSinceUpdate < 30 ? 15 : 0)
        );

        const progressBar = this.generateProgressBar(activityScore);

        let txt = `🌟  \`ᴘʀᴇᴛᴛʏ ᴍᴅ 𝚁𝙴𝙿𝙾𝚂𝙸𝚃𝙾𝚁𝚈 𝙸𝙽𝚂𝙸𝙶𝙷𝚃𝚂\`  🌟\n\n`;

        // Basic Info Section
        txt += `📛  *Repository*: ${json.name}\n`;
        txt += `📖  *Description*: ${json.description || 'No description provided'}\n`;
        txt += `🔗  *URL*: ${json.html_url}\n\n`;

        // Statistics Section
        txt += `📊  *Repository Statistics*\n`;
        txt += `├ ⭐  Stars: ${json.stargazers_count}\n`;
        txt += `├ 🍴  Forks: ${json.forks_count}\n`;
        txt += `├ 👁️  Watchers: ${json.watchers_count}\n`;
        txt += `├ 📦  Size: ${this.formatFileSize(json.size * 1024)}\n`;
        txt += `├ 🏷️  Releases: ${json.release_count}\n`;
        txt += `├ 👥  Contributors: ${json.contributors_count}\n`;
        txt += `└ 📝  Open Issues: ${json.open_issues_count}\n\n`;

        // Activity Section
        txt += `📈  *Activity Overview*\n`;
        txt += `├ 🎯  Activity Score: ${progressBar} ${Math.round(activityScore)}%\n`;
        txt += `├ 📅  Created: ${created.format('DD MMM YYYY')} (${repoAge} days ago)\n`;
        txt += `├ 🔄  Last Updated: ${lastUpdate.format('DD MMM YYYY - HH:mm:ss')}\n`;
        txt += `└ 📆  Days since update: ${daysSinceUpdate}\n\n`;

        // Languages Section
        if (json.top_languages && json.top_languages.length > 0) {
            txt += `💻  *Top Languages*\n`;
            json.top_languages.forEach((lang, index) => {
                const isLast = index === json.top_languages.length - 1;
                const prefix = isLast ? '└' : '├';
                txt += `${prefix} ${lang.lang}: ${this.formatFileSize(lang.bytes)}\n`;
            });
            txt += `\n`;
        }

        // Last Commit Info
        if (json.last_commit) {
            txt += `🔨  *Last Commit*: ${moment(json.last_commit).format('DD MMM YYYY - HH:mm')}\n\n`;
        }

        txt += `🎉  *Thank you for supporting Pretty MD!* \n`;
        txt += `⭐ Star | 🍴 Fork | 👁️ Watch | 💬 Discuss`;

        return txt;
    }

    async githubCommand(sock, chatId, message, args = []) {
        try {
            // Show typing indicator
            await sock.sendPresenceUpdate('composing', chatId);

            const startTime = Date.now();
            const json = await this.getRepoStatistics();
            const fetchTime = Date.now() - startTime;

            let imgBuffer;
            let usedDefault = false;

            // Handle custom image paths from arguments
            if (args.length > 0) {
                const customImagePath = path.join(__dirname, '../assets', args[0]);
                if (await this.validateImagePath(customImagePath)) {
                    imgBuffer = await readFile(customImagePath);
                } else {
                    usedDefault = true;
                    imgBuffer = await readFile(this.defaultImage);
                }
            } else {
                imgBuffer = await readFile(this.defaultImage);
            }

            const txt = this.createAdvancedMessage(json);

            // Add performance metrics to debug log
            console.log(`GitHub command executed in ${fetchTime}ms` + 
                       (usedDefault ? ' (used default image)' : ''));

            await sock.sendMessage(chatId, 
                { 
                    image: imgBuffer, 
                    caption: txt,
                    contextInfo: {
                        externalAdReply: {
                            title: `✨ ${json.name} Repository`,
                            body: `${json.stargazers_count} stars • ${json.forks_count} forks`,
                            mediaType: 1,
                            thumbnail: imgBuffer,
                            sourceUrl: json.html_url
                        }
                    }
                }, 
                { quoted: message }
            );

        } catch (error) {
            console.error('GitHub Command Error:', error);

            let errorMessage = '❌ Error fetching repository information.';
            
            if (error.message.includes('rate limit')) {
                errorMessage = '⚠️ GitHub API rate limit exceeded. Please try again in a few minutes.';
            } else if (error.message.includes('timeout')) {
                errorMessage = '⏰ Request timeout. Please try again later.';
            } else if (error.message.includes('Network')) {
                errorMessage = '🌐 Network error. Please check your connection.';
            }

            await sock.sendMessage(chatId, 
                { 
                    text: errorMessage,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: false
                    }
                }, 
                { quoted: message }
            );
        }
    }

    // Utility method to clear cache
    clearCache() {
        this.cache.clear();
        return 'Cache cleared successfully.';
    }

    // Method to get cache stats
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

// Create singleton instance
const githubCommandInstance = new GitHubCommand();

// Export both the instance and the class
module.exports = {
    githubCommand: (sock, chatId, message, args) => 
        githubCommandInstance.githubCommand(sock, chatId, message, args),
    GitHubCommand,
    clearCache: () => githubCommandInstance.clearCache(),
    getCacheStats: () => githubCommandInstance.getCacheStats()
};

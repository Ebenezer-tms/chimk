const axios = require('axios');

async function fetchCommand(sock, chatId, message) {
    try {
        // Extract URL from message - you might need to adjust this based on how the message is formatted
        const urlMatch = message.match(/(https?:\/\/[^\s]+)/);
        
        if (!urlMatch) {
            await sock.sendMessage(chatId, { 
                text: "❌ Please provide a valid URL to fetch.\n\nUsage: Include a URL starting with http:// or https://" 
            });
            return;
        }

        const url = urlMatch[0];
        
        // Send initial processing message
        await sock.sendMessage(chatId, { 
            text: `⏳ Fetching content from: ${url}` 
        });

        // Fetch the URL content with timeout and headers
        const response = await axios.get(url, {
            timeout: 10000, // 10 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FetchBot/1.0)'
            }
        });

        // Check if response is successful
        if (response.status >= 200 && response.status < 300) {
            const data = response.data;
            
            // Determine content type and handle accordingly
            const contentType = response.headers['content-type'] || '';
            
            if (contentType.includes('application/json')) {
                // For JSON data
                const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
                const formattedJson = JSON.stringify(jsonData, null, 2);
                
                // Split if too long (WhatsApp has message length limits)
                if (formattedJson.length > 4000) {
                    await sock.sendMessage(chatId, { 
                        text: `✅ JSON Response (truncated):\n\n${formattedJson.substring(0, 4000)}...\n\n⚠️ Response too long, showing first 4000 characters.` 
                    });
                } else {
                    await sock.sendMessage(chatId, { 
                        text: `✅ JSON Response:\n\n${formattedJson}` 
                    });
                }
            } else if (contentType.includes('text/html')) {
                // For HTML - extract text content
                const textContent = data.toString()
                    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
                    .replace(/\s+/g, ' ')      // Normalize whitespace
                    .trim();
                
                if (textContent.length > 4000) {
                    await sock.sendMessage(chatId, { 
                        text: `✅ Website Content (truncated):\n\n${textContent.substring(0, 4000)}...\n\n⚠️ Content too long, showing first 4000 characters.` 
                    });
                } else {
                    await sock.sendMessage(chatId, { 
                        text: `✅ Website Content:\n\n${textContent}` 
                    });
                }
            } else if (contentType.includes('text/plain')) {
                // For plain text
                if (data.length > 4000) {
                    await sock.sendMessage(chatId, { 
                        text: `✅ Text Content (truncated):\n\n${data.substring(0, 4000)}...\n\n⚠️ Content too long, showing first 4000 characters.` 
                    });
                } else {
                    await sock.sendMessage(chatId, { 
                        text: `✅ Text Content:\n\n${data}` 
                    });
                }
            } else {
                // For other content types
                await sock.sendMessage(chatId, { 
                    text: `✅ Successfully fetched URL\n\n📊 Status: ${response.status}\n📁 Content-Type: ${contentType}\n📏 Size: ${data.length} characters\n\n⚠️ Content type not fully displayed. Use browser for complete content.` 
                });
            }
            
            // Send metadata
            await sock.sendMessage(chatId, {
                text: `📊 URL Metadata:\n• Status: ${response.status}\n• Content-Type: ${contentType}\n• Size: ${data.length} characters\n• URL: ${url}`
            });
            
        } else {
            await sock.sendMessage(chatId, { 
                text: `❌ Error fetching URL\n\nStatus: ${response.status}\nURL: ${url}` 
            });
        }
        
    } catch (error) {
        console.error('Fetch error:', error);
        
        let errorMessage = '❌ Failed to fetch URL\n\n';
        
        if (error.code === 'ECONNREFUSED') {
            errorMessage += 'Connection refused. The server might be down or blocking requests.';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage += 'Domain not found. Please check the URL.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage += 'Request timed out. The server is taking too long to respond.';
        } else if (error.response) {
            errorMessage += `Server responded with status: ${error.response.status}`;
        } else if (error.request) {
            errorMessage += 'No response received from server.';
        } else {
            errorMessage += `Error: ${error.message}`;
        }
        
        await sock.sendMessage(chatId, { text: errorMessage });
    }
}

module.exports = fetchCommand;

# WhatsApp Bot - Pretty MD

## Overview
This is a WhatsApp bot built with Node.js and the Baileys library. It provides a wide range of commands for group management, fun features, utilities, and automated responses.

## Recent Changes
- **October 30, 2025**: 
  - Added better-sqlite3 for persistent configuration storage
  - Created configdb.js helper for database operations
  - Integrated advanced settings commands from SUBZERO MD
  - Added commands: setbotimage, setbotname, setownername, setvar, and various toggle settings
  - Updated .gitignore to exclude session files, temp media, and environment files

## Project Architecture

### Core Files
- **index.js**: Main entry point that handles bot connection and session management
- **main.js**: Message handler and command router
- **config.js**: Global API configurations and keys
- **settings.js**: Bot configuration and settings

### Key Directories
- **commands/**: Individual command modules
- **lib/**: Helper functions and utilities
- **data/**: JSON data files for bot state
- **session/**: WhatsApp session credentials (gitignored)
- **assets/**: Bot images and media

### Database
- **lib/configdb.js**: SQLite database helper using better-sqlite3
- **data/config.db**: Persistent configuration storage

## Setup Instructions

### Environment Variables
The bot requires a `SESSION_ID` environment variable to connect to WhatsApp. You can obtain this by:
1. Running the bot for the first time
2. Choose option 1 for pairing code or option 2 to paste an existing session ID
3. For pairing code: Enter your WhatsApp number and scan the QR code
4. For session ID: Paste your existing XHYPHER session ID

### Session Management
- The bot automatically detects Replit environment
- Session files are stored in the `session/` directory
- Session ID must start with "XHYPHER" prefix

## Available Commands

### Advanced Settings Commands (New)
- `.setbotimage <url>` or reply to image - Set bot profile image
- `.setbotname <name>` - Set bot name
- `.setownername <name>` - Set owner name
- `.setvar` or `.cmdlist` - View all settings and their status
- `.mode public/private` - Set bot access mode
- `.autotyping on/off` - Toggle auto-typing indicator
- `.alwaysonline on/off` - Toggle always online status
- `.autorecording on/off` - Toggle auto-recording indicator
- `.autostatusreact on/off` - Toggle auto status reactions
- `.antibad on/off` - Toggle anti bad word filter
- `.autosticker on/off` - Toggle auto sticker conversion
- `.autoreply on/off` - Toggle auto reply
- `.autoreact on/off` - Toggle auto reactions
- `.autostatusreply on/off` - Toggle status replies
- `.antibot on/off` - Toggle anti bot protection
- `.heartreact on/off` - Toggle heart reactions

### Owner Commands
- `.sudo` - Manage sudo users
- `.clearsession` - Clear bot session
- `.cleartmp` - Clean temporary files
- `.setpp` - Set bot profile picture
- `.setprefix` - Change command prefix
- `.update` - Update bot code

### Group Management
- `.promote` - Promote user to admin
- `.demote` - Demote admin to user
- `.kick` - Remove user from group
- `.ban` - Ban user from using bot
- `.unban` - Unban user
- `.mute [minutes]` - Mute group
- `.unmute` - Unmute group
- `.tagall` - Tag all members
- `.hidetag` - Hidden tag all members
- `.welcome on/off` - Toggle welcome messages
- `.goodbye on/off` - Toggle goodbye messages
- `.antilink` - Configure anti-link protection
- `.antitag` - Configure anti-tag protection
- `.antibadword` - Configure bad word filter

### Fun & Entertainment
- `.joke` - Get a random joke
- `.meme` - Get a random meme
- `.quote` - Get an inspirational quote
- `.fact` - Get a random fact
- `.ship` - Ship two users
- `.flirt` - Get a flirty message
- `.insult` - Get a roast
- `.compliment` - Get a compliment
- `.8ball <question>` - Ask the magic 8 ball
- `.dare` - Get a dare
- `.truth` - Get a truth question
- `.hangman` - Start hangman game
- `.trivia` - Start trivia game
- `.tictactoe` - Play tic-tac-toe

### Media Commands
- `.sticker` or `.s` - Convert image/video to sticker
- `.toimage` - Convert sticker to image
- `.attp <text>` - Animated text to image
- `.tts <text>` - Text to speech
- `.blur` - Blur an image
- `.removebg` - Remove image background
- `.remini` - Enhance image quality
- `.emojimix <emoji1> <emoji2>` - Mix two emojis

### Download Commands
- `.play <query>` - Download YouTube audio
- `.video <query>` - Download YouTube video
- `.song <query>` - Search and download song
- `.instagram <url>` - Download Instagram media
- `.facebook <url>` - Download Facebook video
- `.tiktok <url>` - Download TikTok video
- `.spotify <url>` - Download Spotify track
- `.apk <name>` - Download APK file

### Information
- `.help` or `.menu` - Show command list
- `.ping` - Check bot speed
- `.alive` - Check if bot is online
- `.owner` - Get owner contact
- `.settings` - View bot settings
- `.weather <city>` - Get weather info
- `.news` - Get latest news
- `.lyrics <song>` - Get song lyrics

### AI Commands
- `.ai <query>` - Ask AI assistant
- `.imagine <prompt>` - Generate AI image
- `.chatbot on/off` - Toggle AI chatbot in group

### Utilities
- `.translate <text>` - Translate text
- `.ss <url>` - Take website screenshot
- `.url <file>` - Convert media to URL
- `.gitclone <url>` - Clone GitHub repository
- `.bible` - Get random Bible verse
- `.quran` - Get random Quran verse

## Bot Features

### Auto Features
- **Auto Read**: Automatically read messages
- **Auto Typing**: Show typing indicator
- **Auto Status**: Auto view statuses
- **Auto Reaction**: React to messages automatically
- **Auto Sticker**: Convert media to stickers automatically

### Protection Features
- **Anti Link**: Remove users who send links
- **Anti Tag**: Prevent mass tagging
- **Anti Delete**: Recover deleted messages
- **Anti Bad Word**: Filter inappropriate language
- **Anti Call**: Reject incoming calls
- **PM Blocker**: Block private messages

### Database Configuration
Settings are stored persistently in `data/config.db` using better-sqlite3. This allows settings to survive bot restarts.

## User Preferences
- Default prefix: `.` (dot)
- Bot can operate in public or private mode
- Owner can configure all settings via commands
- Settings persist across restarts

## Technical Details
- **Runtime**: Node.js 20
- **Main Library**: @whiskeysockets/baileys (WhatsApp Web API)
- **Database**: better-sqlite3
- **Session**: Multi-file auth state
- **Platform**: Replit (auto-detected)

## Troubleshooting

### Bot Not Connecting
1. Ensure SESSION_ID is set correctly
2. Check that SESSION_ID starts with "XHYPHER"
3. Clear session files and re-authenticate

### Commands Not Working
1. Check if bot is in private mode (only owner can use)
2. Verify command prefix with `.settings`
3. Ensure you have proper permissions (admin/owner)

### Session Timeout Errors
The bot automatically handles connection timeouts and will restart after 3 consecutive errors to prevent infinite loops.

## Development Notes
- Bot uses pino logger (silent mode)
- Message backup stored for 24 hours
- Junk files auto-cleaned periodically
- Bot detects host environment (Replit, Heroku, VPS, etc.)

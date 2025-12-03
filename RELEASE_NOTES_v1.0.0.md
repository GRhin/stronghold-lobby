# Stronghold Lobby v1.0.0 - First Release

**Release Date:** December 3, 2024

We're excited to announce the first official release of **Stronghold Lobby** - a modern multiplayer lobby system for Stronghold Crusader!

---

## 🎮 What is Stronghold Lobby?

Stronghold Lobby is a desktop application that makes it easy to organize and join multiplayer games for Stronghold Crusader and Stronghold Crusader Extreme. It provides a modern, Discord-like interface for matchmaking, friend management, and lobby organization.

---

## ✨ Key Features

### 🌐 Steam Integration
- **Seamless Steam Lobbies** - Create and join games through Steam's native matchmaking
- **Automatic Game Detection** - No need to manually configure game paths
- **Both Game Modes Supported** - Play regular Stronghold Crusader or Crusader Extreme
- **One-Click Launch** - Host or join games with a single button click

### 👥 Social Features
- **Friends System** - Add friends and see when they're online
- **Direct Messaging** - Chat with friends privately
- **Lobby Invitations** - Invite friends directly to your games
- **Online Status** - See which friends are online and in lobbies

### 🏆 Competitive Features
- **Elo Rating System** - Track your skill with competitive ratings (starts at 1000)
- **Rated & Casual Modes** - Choose ranked games or casual play
- **Automatic Result Reporting** - Hosts can report match results for rating updates
- **Leaderboards** - See player ratings in lobby lists

### 🎯 Lobby Management
- **Custom Lobby Names** - Name your lobbies for easy identification
- **Game Mode Selection** - Choose Crusader or Extreme before launching
- **Visual Indicators** - See game modes, player counts, and lobby status at a glance
- **Host Migration** - Automatic host transfer if the original host leaves
- **Current Lobby Sidebar** - Quick navigation back to your active game

### 💬 Communication
- **Lobby Chat** - Talk to players in your lobby
- **Global Chat** - Community-wide chat (when server is connected)
- **Friend Messages** - Private conversations with friends

---

## 📥 Installation

### System Requirements
- **OS:** Windows 10/11 (64-bit)
- **Steam:** Required and must be running
- **Game:** Stronghold Crusader or Stronghold Crusader Extreme installed via Steam
- **Internet:** Required for multiplayer features

### Installation Steps
1. Download `Stronghold Lobby Setup 1.0.0.exe`
2. Run the installer
3. Follow the installation wizard
4. Launch Stronghold Lobby from your Start Menu or Desktop shortcut
5. Make sure Steam is running
6. The app will detect your Steam account automatically

---

## 🚀 Getting Started

### First Time Setup
1. **Launch the app** - Steam must be running
2. **Automatic Login** - Your Steam account is detected automatically
3. **Browse Lobbies** - See available games in the Lobby Browser
4. **Create or Join** - Start your own lobby or join an existing one

### Creating a Lobby
1. Click **"+ Create Lobby"** in the Lobby Browser
2. Enter a lobby name
3. Choose game mode (Crusader or Extreme)
4. Select if the lobby is rated
5. Click Create

### Joining a Lobby
1. Browse the lobby list
2. Click on a lobby to see details
3. Click **"Join Game"**
4. Click **"Launch Game"** when ready to play

### Adding Friends
1. Go to the **Friends** tab
2. Use the search bar to find players by name
3. Click **"Send Request"**
4. Wait for them to accept

---

## 🔧 Technical Details

### Architecture
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Socket.IO + Express
- **Desktop:** Electron
- **Matchmaking:** steamworks.js (Steam API)

### Game Launch Method
- **Host:** Launches with `+lobby_host` argument
- **Clients:** Launch with `+connect_lobby <lobbyId>` argument
- **Auto-Detection:** Game path is automatically detected from Steam

---

## ⚠️ Known Issues & Limitations

### Server Connection
- The custom server (for Elo ratings and friends) may occasionally be unavailable
- If server is offline, Steam lobbies still work, but Elo ratings and custom features are unavailable
- A yellow warning banner will appear when server is disconnected

### Free Server Hosting
- The backend server uses a free tier that sleeps after 15 minutes of inactivity
- First connection after sleep may take 30 seconds to wake up
- This is normal and expected behavior

### Windows Defender Alert
- Windows may show a SmartScreen warning on first install
- This is because the app is unsigned (code signing is expensive)
- Click "More info" → "Run anyway" to proceed
- The app is safe and open-source

### Game Detection
- Game must be installed via Steam for auto-detection
- Non-Steam versions are not supported
- If detection fails, the app will fall back to Steam protocol launch

---

## 🛠️ Troubleshooting

### "Game won't launch"
- Verify Steam is running
- Ensure Stronghold Crusader is installed via Steam
- Check that you selected the correct game mode
- Try Steam overlay (Shift+Tab) to verify Steam integration

### "Can't connect to server"
- Check your internet connection
- Server may be sleeping (wait 30 seconds)
- Steam lobbies will still work without custom server

### "Friends not showing online"
- Ask friends to open the app
- Server connection may be down (check warning banner)
- Try refreshing the friends list

### "Elo rating not updating"
- Server must be connected (no yellow warning)
- Lobby must be marked as "Rated"
- Only the host can report results
- Results must be reported after the game ends

---

## 📝 Release Notes

### v1.0.0 - Initial Release

**Features:**
- ✅ Steam lobby integration with auto-detection
- ✅ Support for both Stronghold Crusader and Crusader Extreme
- ✅ Friends system with online status
- ✅ Direct messaging between friends
- ✅ Lobby invitations
- ✅ Elo rating system for competitive play
- ✅ Automatic result reporting
- ✅ Custom lobby names
- ✅ Game mode selection
- ✅ Host migration
- ✅ Modern, polished UI
- ✅ Single-click game launching
- ✅ Current lobby quick navigation

**Technical Improvements:**
- Production-ready server deployment guide
- Automatic game path detection via Steam API
- Proper error handling and graceful fallbacks
- Clean TypeScript codebase
- Optimized build configuration

---

## 🙏 Credits

**Developed by:** [Your Name/Team]

**Built with:**
- React & TypeScript
- Electron
- steamworks.js
- Socket.IO
- Node.js

**Special Thanks:**
- The Stronghold community
- Steam Workshop and modding community
- All beta testers and early adopters

---

## 📞 Support & Feedback

- **Issues:** Report bugs on GitHub Issues
- **Suggestions:** Share ideas on GitHub Discussions
- **Community:** Join our Discord (link TBD)

---

## 📜 License

This project is open source. See LICENSE file for details.

---

## 🔮 Future Roadmap

Planned features for future releases:
- Tournament system
- Match history tracking
- Advanced statistics
- Custom game settings
- Team formation tools
- Replay sharing
- Cross-platform support (Mac/Linux)
- In-app voice chat

---

**Thank you for using Stronghold Lobby! Happy gaming! 🏰⚔️**

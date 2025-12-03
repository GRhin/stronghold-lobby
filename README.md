# Stronghold Lobby

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/GRhin/stronghold-lobby/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)](https://github.com/GRhin/stronghold-lobby)

A modern multiplayer lobby system for **Stronghold Crusader** and **Stronghold Crusader Extreme** with Steam integration, friends system, and competitive Elo ratings.

![Stronghold Lobby](https://via.placeholder.com/800x400?text=Stronghold+Lobby+Screenshot)

---

## 🎮 Features

### Steam Integration
- ✅ **Native Steam Lobbies** - Seamless matchmaking through Steam
- ✅ **Automatic Game Detection** - No manual configuration needed
- ✅ **Both Game Modes** - Support for regular and Extreme versions
- ✅ **One-Click Launch** - Host or join with a single button

### Social Features
- 👥 **Friends System** - Add friends and see online status
- 💬 **Direct Messaging** - Private chat with friends
- 📨 **Lobby Invitations** - Invite friends to your games
- 🟢 **Online Status** - See who's playing and where

### Competitive Play
- 🏆 **Elo Rating System** - Track skill with competitive ratings
- ⚔️ **Rated & Casual Modes** - Choose your game type
- 📊 **Leaderboards** - See player ratings in lobby lists
- 🎯 **Match Results** - Automatic Elo updates after games

### Lobby Management
- 🏷️ **Custom Names** - Name your lobbies
- 🎮 **Game Mode Selection** - Crusader or Extreme
- 👑 **Host Migration** - Automatic when host leaves
- 📍 **Quick Navigation** - Sidebar shows current lobby

---

## 📥 Download

**Latest Release:** [v1.0.0](https://github.com/GRhin/stronghold-lobby/releases/latest)

Download `Stronghold Lobby Setup 1.0.0.exe` and run the installer.

### System Requirements
- Windows 10/11 (64-bit)
- Steam (must be running)
- Stronghold Crusader or Crusader Extreme (via Steam)
- Internet connection

---

## 🚀 Quick Start

1. **Install** - Run the downloaded installer
2. **Launch** - Open Stronghold Lobby (Steam must be running)
3. **Auto-Login** - Your Steam account is detected automatically
4. **Play** - Browse lobbies or create your own!

### Creating a Lobby
```
1. Click "+ Create Lobby"
2. Enter lobby name
3. Choose game mode (Crusader/Extreme)
4. Select rated/casual
5. Click Create
```

### Joining a Lobby
```
1. Browse the lobby list
2. Click on a lobby
3. Click "Join Game"
4. Click "Launch Game" when ready
```

---

## 🛠️ Development

### Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Socket.IO + Express
- **Desktop:** Electron
- **Steam API:** steamworks.js
- **Styling:** TailwindCSS

### Project Structure
```
stronghold-lobby/
├── src/               # React frontend
│   ├── components/    # UI components
│   ├── context/       # React contexts
│   ├── pages/         # Page components
│   └── types/         # TypeScript definitions
├── electron/          # Electron main process
│   ├── main.ts        # Entry point
│   ├── steam.ts       # Steam integration
│   └── game.ts        # Game launcher
├── server/            # Backend server
│   └── index.js       # Express + Socket.IO server
└── release/           # Built installers (gitignored)
```

### Setup Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/GRhin/stronghold-lobby.git
   cd stronghold-lobby
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```
   This starts both the Electron app and the backend server.

4. **Build for production**
   ```bash
   npm run build
   ```
   Outputs to `release/Stronghold Lobby Setup [version].exe`

### Available Scripts

- `npm run dev` - Start development mode (frontend + backend)
- `npm run build` - Build production installer
- `npm run build:dir` - Build unpacked (for testing)
- `npm run server` - Run backend server only
- `npm run lint` - Run ESLint

---

## 🌐 Server Deployment

The backend server handles friends, messaging, and Elo ratings. See [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy (Render.com)
1. Sign up at [render.com](https://render.com)
2. Create Web Service from GitHub
3. Set root directory to `server`
4. Deploy automatically

The Steam lobby system works independently of the backend server.

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Maintain existing code style
- Test thoroughly before submitting
- Update documentation as needed

---

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/GRhin/stronghold-lobby/issues) with:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Your system info (Windows version, Steam version)

---

## ⚠️ Known Issues

- **Windows Defender Warning:** App is unsigned, click "More info" → "Run anyway"
- **Server Sleep:** Free tier server sleeps after 15min (first wake takes ~30s)
- **Steam Required:** Game must be installed via Steam for auto-detection

See [RELEASE_NOTES](RELEASE_NOTES_v1.0.0.md) for full list of known issues.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Stronghold Community** - For keeping this classic game alive
- **steamworks.js** - For the excellent Steam API wrapper
- **Firefly Studios** - For creating Stronghold Crusader

---

## 📞 Support

- **Documentation:** [Release Notes](RELEASE_NOTES_v1.0.0.md)
- **Server Setup:** [Deployment Guide](SERVER_DEPLOYMENT.md)
- **Issues:** [GitHub Issues](https://github.com/GRhin/stronghold-lobby/issues)
- **Discussions:** [GitHub Discussions](https://github.com/GRhin/stronghold-lobby/discussions)

---

## 🗺️ Roadmap

Future features planned:
- [ ] Tournament system
- [ ] Match history & statistics
- [ ] Custom game settings
- [ ] Team formation tools
- [ ] Replay sharing
- [ ] Cross-platform support (Mac/Linux)
- [ ] In-app voice chat
- [ ] Advanced matchmaking algorithms

---

## 📊 Project Status

- **Status:** Active Development
- **Current Version:** 1.0.0
- **Last Updated:** December 2024

---

**Made with ❤️ for the Stronghold community**

**Happy sieging! 🏰⚔️**

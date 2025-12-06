"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
const fs = require("fs");
const steamworks = require("steamworks.js");
const promises = require("stream/promises");
const stream = require("stream");
let client = null;
let currentLobby = null;
function initSteam() {
  try {
    client = steamworks.init(40970);
    console.log("Steam initialized:", client.localplayer.getName());
    console.log("Client keys:", Object.keys(client));
    console.log("Localplayer keys:", Object.keys(client.localplayer));
  } catch (err) {
    console.error("Failed to initialize Steam:", err);
  }
}
function setupSteamHandlers() {
  electron.ipcMain.handle("get-steam-user", () => {
    if (!client) return null;
    return {
      name: client.localplayer.getName(),
      steamId: client.localplayer.getSteamId().steamId64.toString()
    };
  });
  electron.ipcMain.handle("get-auth-ticket", async () => {
    if (!client) throw new Error("Steam not initialized");
    try {
      const ticket = await client.auth.getAuthTicketForWebApi("LobbyClient");
      return ticket.getBytes().toString("hex");
    } catch (err) {
      console.error("Failed to get auth ticket:", err);
      return null;
    }
  });
  electron.ipcMain.handle("get-steam-friends", () => {
    if (!client) return [];
    if (!client.friends) {
      console.warn("Steam Friends interface not available in this version of steamworks.js");
      return [
        { id: "76561198000000001", name: "Sir William (Mock)", status: 1, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=William" },
        { id: "76561198000000002", name: "The Snake (Mock)", status: 6, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Snake" },
        { id: "76561198000000003", name: "The Rat (Mock)", status: 0, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rat" }
      ];
    }
    const friends = client.friends.getFriends(4);
    return friends.map((f) => ({
      id: f.getSteamId().steamId64.toString(),
      name: f.getName(),
      status: f.getPersonaState(),
      // 0=Offline, 1=Online, etc.
      avatar: f.getMediumAvatarUrl()
    }));
  });
  electron.ipcMain.handle("steam-create-lobby", async (_, maxMembers = 8, lobbyName = "Lobby", gameMode = "crusader") => {
    if (!client) throw new Error("Steam not initialized");
    try {
      currentLobby = await client.matchmaking.createLobby(2, maxMembers);
      console.log("Created lobby:", currentLobby.id);
      const nameSet = currentLobby.setData("name", lobbyName);
      if (!nameSet) {
        console.warn("Failed to set lobby name");
      }
      const gameModeSet = currentLobby.setData("gameMode", gameMode);
      if (!gameModeSet) {
        console.warn("Failed to set game mode");
      }
      return {
        id: currentLobby.id.toString(),
        owner: currentLobby.getOwner().steamId64.toString(),
        name: lobbyName,
        gameMode
      };
    } catch (err) {
      console.error("Failed to create lobby:", err);
      throw err;
    }
  });
  electron.ipcMain.handle("steam-get-lobbies", async () => {
    if (!client) return [];
    try {
      const lobbies = await client.matchmaking.getLobbies();
      return lobbies.map((l) => ({
        id: l.id.toString(),
        memberCount: l.getMemberCount(),
        maxMembers: l.getMemberLimit(),
        name: l.getData("name") || "Unnamed Lobby",
        gameMode: l.getData("gameMode") || "crusader"
      }));
    } catch (err) {
      console.error("Failed to get lobbies:", err);
      return [];
    }
  });
  electron.ipcMain.handle("steam-join-lobby", async (_, lobbyId) => {
    if (!client) throw new Error("Steam not initialized");
    try {
      console.log("Joining lobby:", lobbyId);
      currentLobby = await client.matchmaking.joinLobby(BigInt(lobbyId));
      return {
        id: currentLobby.id.toString(),
        owner: currentLobby.getOwner().steamId64.toString()
      };
    } catch (err) {
      console.error("Failed to join lobby:", err);
      throw err;
    }
  });
  electron.ipcMain.handle("steam-leave-lobby", async () => {
    if (currentLobby) {
      console.log("Leaving lobby:", currentLobby.id);
      await currentLobby.leave();
      currentLobby = null;
    }
  });
  electron.ipcMain.handle("steam-get-lobby-members", async () => {
    if (!currentLobby) return [];
    try {
      const members = currentLobby.getMembers();
      const memberData = [];
      for (const m of members) {
        const steamId = m.steamId64;
        let name = steamId.toString();
        if (client.localplayer && steamId === client.localplayer.getSteamId().steamId64) {
          name = client.localplayer.getName();
        } else {
          currentLobby.requestLobbyMemberData(steamId);
          const personaName = currentLobby.getMemberData(steamId, "name");
          if (personaName) {
            name = personaName;
          }
        }
        memberData.push({
          id: steamId.toString(),
          name
        });
      }
      return memberData;
    } catch (err) {
      console.error("Failed to get lobby members:", err);
      return [];
    }
  });
  electron.ipcMain.handle("steam-send-lobby-chat", async (_, message) => {
    if (!currentLobby) throw new Error("Not in a lobby");
    try {
      const success = currentLobby.sendChatMsg(message);
      if (!success) {
        console.error("Failed to send lobby chat message");
      }
      return success;
    } catch (err) {
      console.error("Error sending lobby chat:", err);
      throw err;
    }
  });
  electron.ipcMain.handle("steam-setup-lobby-chat-listener", async () => {
    if (!currentLobby || !client) return false;
    try {
      client.matchmaking.on("lobby-chat-message", (lobbyId, sender, message) => {
        if (currentLobby && lobbyId.toString() === currentLobby.id.toString()) {
          let senderName = sender.steamId64.toString();
          if (client.localplayer && sender.steamId64 === client.localplayer.getSteamId().steamId64) {
            senderName = client.localplayer.getName();
          } else {
            currentLobby.requestLobbyMemberData(sender.steamId64);
            const name = currentLobby.getMemberData(sender.steamId64, "name");
            if (name) senderName = name;
          }
          const windows = electron.BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows[0].webContents.send("lobby-chat-message", {
              senderId: sender.steamId64.toString(),
              senderName,
              message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        }
      });
      return true;
    } catch (err) {
      console.error("Error setting up lobby chat listener:", err);
      return false;
    }
  });
}
function getGameInstallDir() {
  if (!client) {
    console.error("getGameInstallDir: Client is null");
    return null;
  }
  try {
    console.log("getGameInstallDir: Attempting to get install dir for 40970");
    const dir = client.apps.appInstallDir(40970);
    console.log("getGameInstallDir: Result:", dir);
    return dir;
  } catch (err) {
    console.error("getGameInstallDir: Failed to get install dir:", err);
    return null;
  }
}
let mainWindow = null;
function setMainWindow(win2) {
  mainWindow = win2;
}
function setupGameHandlers() {
  electron.ipcMain.handle("select-game-path", async () => {
    const result = await electron.dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Executables", extensions: ["exe"] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
  electron.ipcMain.handle("launch-game", async (_, gamePath, args) => {
    if (!fs.existsSync(gamePath)) {
      throw new Error("Game executable not found");
    }
    const argsArray = args.split(" ").filter((arg) => arg.length > 0);
    const cwd = path.dirname(gamePath);
    console.log(`Launching game: "${gamePath}" with args: ${argsArray} in ${cwd}`);
    try {
      const child = child_process.spawn(`"${gamePath}"`, argsArray, {
        cwd,
        detached: true,
        shell: true,
        windowsVerbatimArguments: true
        // Helps with argument parsing on Windows
      });
      child.on("error", (err) => {
        console.error("Failed to start game:", err);
      });
      child.on("close", (code) => {
        console.log(`Game process closed with code ${code}`);
        if (mainWindow) {
          mainWindow.webContents.send("game-exited", code);
        }
      });
      child.unref();
      return { success: true };
    } catch (error) {
      console.error("Launch error:", error);
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("launch-steam-game", async (_, args, gameMode = "crusader") => {
    console.log("Attempting to auto-detect game path...");
    const installDir = getGameInstallDir();
    if (!installDir) {
      console.error("Could not detect game install directory");
      const encodedArgs = encodeURIComponent(args).replace(/%2B/g, "+");
      const url = `steam://run/40970//${encodedArgs}`;
      console.log("Fallback to Steam URL:", url);
      try {
        await electron.shell.openExternal(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    const exeName = gameMode === "extreme" ? "Stronghold_Crusader_Extreme.exe" : "Stronghold Crusader.exe";
    const gamePath = path.join(installDir, exeName);
    console.log("Auto-detected game path:", gamePath, "(Mode:", gameMode, ")");
    if (!fs.existsSync(gamePath)) {
      console.error("Executable not found at:", gamePath);
      return { success: false, error: `Executable not found: ${exeName}` };
    }
    const argsArray = args.split(" ").filter((arg) => arg.length > 0);
    argsArray.push("--ucp-verbosity 10");
    argsArray.push("--ucp-no-security");
    console.log("Launching with arguments:", args, "-> Array:", argsArray);
    try {
      const child = child_process.spawn(`"${gamePath}"`, argsArray, {
        cwd: installDir,
        detached: true,
        shell: true,
        windowsVerbatimArguments: true
      });
      child.unref();
      return { success: true };
    } catch (error) {
      console.error("Launch error:", error);
      return { success: false, error: error.message };
    }
  });
}
function setupDownloaderHandlers() {
  electron.ipcMain.handle("download-file", async (_, url, filename, targetFolder) => {
    try {
      console.log(`Starting download: ${url} -> ${filename}`);
      let downloadPath = "";
      if (targetFolder === "maps") {
        downloadPath = path.join(electron.app.getPath("documents"), "Stronghold Crusader", "Maps");
      } else if (targetFolder === "ucp") {
        downloadPath = path.join(electron.app.getPath("userData"), "UCP");
      } else {
        downloadPath = path.join(electron.app.getPath("downloads"));
      }
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }
      const filePath = path.join(downloadPath, filename);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      if (!response.body) throw new Error("No response body");
      const stream$1 = stream.Readable.fromWeb(response.body);
      await promises.pipeline(stream$1, fs.createWriteStream(filePath));
      console.log(`Download complete: ${filePath}`);
      return { success: true, path: filePath };
    } catch (error) {
      console.error("Download error:", error);
      return { success: false, error: error.message };
    }
  });
}
setupGameHandlers();
setupDownloaderHandlers();
initSteam();
setupSteamHandlers();
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  const publicPath = process.env.VITE_PUBLIC || "";
  win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(publicPath, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: true
    },
    backgroundColor: "#1a1a1a",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#1a1a1a",
      symbolColor: "#ffffff",
      height: 30
    }
  });
  setMainWindow(win);
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.env.DIST || "", "index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.app.whenReady().then(createWindow);

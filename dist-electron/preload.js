"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  selectGamePath: () => electron.ipcRenderer.invoke("select-game-path"),
  launchGame: (path, args) => electron.ipcRenderer.invoke("launch-game", path, args),
  launchSteamGame: (args, gameMode, customPath) => electron.ipcRenderer.invoke("launch-steam-game", args, gameMode, customPath),
  downloadFile: (url, filename, targetFolder) => electron.ipcRenderer.invoke("download-file", url, filename, targetFolder),
  saveSettings: (settings) => console.log("Save settings (mock)", settings),
  // Placeholder
  onGameExited: (callback) => {
    const subscription = (_, code) => callback(code);
    electron.ipcRenderer.on("game-exited", subscription);
    return () => electron.ipcRenderer.removeListener("game-exited", subscription);
  },
  getSteamUser: () => electron.ipcRenderer.invoke("get-steam-user"),
  getAuthTicket: () => electron.ipcRenderer.invoke("get-auth-ticket"),
  getSteamFriends: () => electron.ipcRenderer.invoke("get-steam-friends"),
  createLobby: (maxMembers, lobbyName, gameMode) => electron.ipcRenderer.invoke("steam-create-lobby", maxMembers, lobbyName, gameMode),
  getLobbies: () => electron.ipcRenderer.invoke("steam-get-lobbies"),
  joinLobby: (lobbyId) => electron.ipcRenderer.invoke("steam-join-lobby", lobbyId),
  leaveLobby: () => electron.ipcRenderer.invoke("steam-leave-lobby"),
  getLobbyMembers: () => electron.ipcRenderer.invoke("steam-get-lobby-members")
});
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };
  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
    selectGamePath: () => ipcRenderer.invoke('select-game-path'),
    launchGame: (path: string, args: string) => ipcRenderer.invoke('launch-game', path, args),
    launchSteamGame: (args: string, gameMode?: 'crusader' | 'extreme', customPath?: string) => ipcRenderer.invoke('launch-steam-game', args, gameMode, customPath),
    downloadFile: (url: string, filename: string, targetFolder: string) => ipcRenderer.invoke('download-file', url, filename, targetFolder),
    saveSettings: (settings: any) => console.log('Save settings (mock)', settings), // Placeholder
    onGameExited: (callback: (code: number) => void) => {
        const subscription = (_: any, code: number) => callback(code)
        ipcRenderer.on('game-exited', subscription)
        return () => ipcRenderer.removeListener('game-exited', subscription)
    },
    removeGameExitedListener: (callback: any) => {
        ipcRenderer.removeListener('game-exited', callback)
    },
    getSteamUser: () => ipcRenderer.invoke('get-steam-user'),
    getAuthTicket: () => ipcRenderer.invoke('get-auth-ticket'),
    getSteamFriends: () => ipcRenderer.invoke('get-steam-friends'),
    createLobby: (maxMembers: number, lobbyName?: string, gameMode?: 'crusader' | 'extreme') => ipcRenderer.invoke('steam-create-lobby', maxMembers, lobbyName, gameMode),
    setLobbyData: (key: string, value: string) => ipcRenderer.invoke('steam-set-lobby-data', key, value),
    getLobbies: () => ipcRenderer.invoke('steam-get-lobbies'),
    joinLobby: (lobbyId: string) => ipcRenderer.invoke('steam-join-lobby', lobbyId),
    leaveLobby: () => ipcRenderer.invoke('steam-leave-lobby'),
    getLobbyMembers: () => ipcRenderer.invoke('steam-get-lobby-members')
})

// Preload script
window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector: string, text: string) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type] as string)
    }
})

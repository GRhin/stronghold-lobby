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
    getLobbyMembers: () => ipcRenderer.invoke('steam-get-lobby-members'),

    // UCP
    ucpReadFile: (path: string) => ipcRenderer.invoke('ucp-read-file', path),
    ucpReadBinary: (path: string) => ipcRenderer.invoke('ucp-read-binary', path),
    ucpGetStats: (path: string) => ipcRenderer.invoke('ucp-get-stats', path),
    ucpZipFolder: (folderPath: string, outputPath?: string) => ipcRenderer.invoke('ucp-zip-folder', folderPath, outputPath),
    ucpBackupFile: (path: string) => ipcRenderer.invoke('ucp-backup-file', path),
    ucpRestoreFile: (path: string) => ipcRenderer.invoke('ucp-restore-file', path),
    ucpWriteFile: (path: string, buffer: ArrayBuffer) => ipcRenderer.invoke('ucp-write-file', path, buffer),
    ucpUnzip: (zipPath: string, destPath: string) => ipcRenderer.invoke('ucp-unzip', zipPath, destPath),
    ucpDeleteFile: (path: string) => ipcRenderer.invoke('ucp-delete-file', path)
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

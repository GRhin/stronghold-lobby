import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
    selectGamePath: () => ipcRenderer.invoke('select-game-path'),
    launchGame: (path: string, args: string) => ipcRenderer.invoke('launch-game', path, args),
    downloadFile: (url: string, filename: string, targetFolder: string) => ipcRenderer.invoke('download-file', url, filename, targetFolder),
    saveSettings: (settings: any) => console.log('Save settings (mock)', settings), // Placeholder
    onGameExited: (callback: (code: number) => void) => {
        const subscription = (_: any, code: number) => callback(code)
        ipcRenderer.on('game-exited', subscription)
        return () => ipcRenderer.removeListener('game-exited', subscription)
    },
    getSteamUser: () => ipcRenderer.invoke('get-steam-user'),
    getAuthTicket: () => ipcRenderer.invoke('get-auth-ticket')
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

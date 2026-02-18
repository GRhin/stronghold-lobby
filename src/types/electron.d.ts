export interface ElectronAPI {
    selectGamePath: () => Promise<string | null>
    launchGame: (path: string, args: string) => Promise<{ success: boolean; error?: string }>
    launchSteamGame: (args: string, gameMode?: 'crusader' | 'extreme', customPath?: string) => Promise<{ success: boolean; error?: string }>
    downloadFile: (url: string, filename: string, targetFolder: string) => Promise<string>
    saveSettings: (settings: any) => void
    onGameExited: (callback: (code: number) => void) => () => void
    getSteamUser: () => Promise<{ name: string; steamId: string } | null>
    getAuthTicket: () => Promise<string | null>
    getSteamFriends: () => Promise<any[]>
    createLobby: (maxMembers: number, lobbyName?: string, gameMode?: 'crusader' | 'extreme') => Promise<{ id: string; owner: string; name: string; gameMode: 'crusader' | 'extreme' }>
    getLobbies: () => Promise<Array<{ id: string; memberCount: number; maxMembers: number; name: string; gameMode: 'crusader' | 'extreme' }>>
    joinLobby: (lobbyId: string) => Promise<{ id: string; owner: string }>
    leaveLobby: () => Promise<void>
    getLobbyMembers: () => Promise<Array<{ id: string; name: string }>>
    setLobbyData: (key: string, value: string) => Promise<void>
    removeGameExitedListener: (callback: (code: number) => void) => void

    // UCP
    ucpReadFile: (path: string) => Promise<string>
    ucpReadBinary: (path: string) => Promise<Uint8Array>
    ucpGetStats: (path: string) => Promise<{ size: number, mtime: Date } | null>
    ucpZipFolder: (folderPath: string, outputPath?: string) => Promise<Uint8Array>
    ucpBackupFile: (path: string) => Promise<boolean>
    ucpRestoreFile: (path: string) => Promise<boolean>
    ucpWriteFile: (path: string, buffer: ArrayBuffer) => Promise<boolean>
    ucpUnzip: (zipPath: string, destPath: string) => Promise<boolean>
    ucpDeleteFile: (path: string) => Promise<boolean>
}

declare global {
    interface Window {
        electron: ElectronAPI
    }
}

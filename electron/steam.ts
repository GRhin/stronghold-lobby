import { ipcMain, BrowserWindow } from 'electron'
import steamworks from 'steamworks.js'

let client: any = null
let currentLobby: any = null

export function initSteam() {
    try {
        client = steamworks.init(40970) // Stronghold Crusader App ID
        console.log('Steam initialized:', client.localplayer.getName())
        console.log('Client keys:', Object.keys(client))
        console.log('Localplayer keys:', Object.keys(client.localplayer))
    } catch (err) {
        console.error('Failed to initialize Steam:', err)
    }
}

export function setupSteamHandlers() {
    ipcMain.handle('get-steam-user', () => {
        if (!client) return null
        return {
            name: client.localplayer.getName(),
            steamId: client.localplayer.getSteamId().steamId64.toString()
        }
    })

    ipcMain.handle('get-auth-ticket', async () => {
        if (!client) throw new Error('Steam not initialized')
        try {
            const ticket = await client.auth.getAuthTicketForWebApi('LobbyClient')
            return ticket.getBytes().toString('hex')
        } catch (err) {
            console.error('Failed to get auth ticket:', err)
            return null
        }
    })

    ipcMain.handle('get-steam-friends', () => {
        if (!client) return []

        if (!client.friends) {
            console.warn('Steam Friends interface not available in this version of steamworks.js')
            // Return mock data for demonstration
            return [
                { id: '76561198000000001', name: 'Sir William (Mock)', status: 1, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=William' },
                { id: '76561198000000002', name: 'The Snake (Mock)', status: 6, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Snake' },
                { id: '76561198000000003', name: 'The Rat (Mock)', status: 0, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rat' }
            ]
        }

        const friends = client.friends.getFriends(0x04) // 0x04 = Regular friends
        return friends.map((f: any) => ({
            id: f.getSteamId().steamId64.toString(),
            name: f.getName(),
            status: f.getPersonaState(), // 0=Offline, 1=Online, etc.
            avatar: f.getMediumAvatarUrl()
        }))
    })

    // --- Lobby Handlers ---

    ipcMain.handle('steam-create-lobby', async (_, maxMembers: number = 8, lobbyName: string = 'Lobby', gameMode: 'crusader' | 'extreme' = 'crusader') => {
        if (!client) throw new Error('Steam not initialized')
        try {
            // 2 = Public, 1 = FriendsOnly, 0 = Private
            currentLobby = await client.matchmaking.createLobby(2, maxMembers)
            console.log('Created lobby:', currentLobby.id)

            // Store the lobby name and game mode in Steam lobby metadata
            const nameSet = currentLobby.setData('name', lobbyName)
            if (!nameSet) {
                console.warn('Failed to set lobby name')
            }

            const gameModeSet = currentLobby.setData('gameMode', gameMode)
            if (!gameModeSet) {
                console.warn('Failed to set game mode')
            }

            // Set status to Open
            currentLobby.setData('status', 'Open')

            // Initialize status to Open (fallback for when not using game server logic)
            currentLobby.setData('status', 'Open')

            return {
                id: currentLobby.id.toString(),
                owner: currentLobby.getOwner().steamId64.toString(),
                name: lobbyName,
                gameMode: gameMode
            }
        } catch (err) {
            console.error('Failed to create lobby:', err)
            throw err
        }
    })

    ipcMain.handle('steam-get-lobbies', async () => {
        if (!client) return []
        try {
            const lobbies = await client.matchmaking.getLobbies()

            return lobbies.map((l: any) => {
                // Check if lobby has a game server associated (indicates in-game)
                // UCP lobbies and our lobbies that have launched will have __gameserverSteamID set
                const data = l.getFullData()
                const hasGameServer = data.__gameserverSteamID && data.__gameserverSteamID !== '0'
                const isInGame = hasGameServer || l.getData('status') === 'In Game'

                // Get owner info
                const owner = l.getOwner()
                const ownerId = owner.steamId64.toString()
                const ownerName = owner.getName() || ownerId

                return {
                    id: l.id.toString(),
                    owner: ownerId,
                    ownerName: ownerName,
                    memberCount: l.getMemberCount(),
                    maxMembers: l.getMemberLimit(),
                    name: l.getData('name') || 'Unnamed Lobby',
                    gameMode: (l.getData('gameMode') as 'crusader' | 'extreme') || 'crusader',
                    isInGame
                }
            })
        } catch (err) {
            console.error('Failed to get lobbies:', err)
            return []
        }
    })

    ipcMain.handle('steam-join-lobby', async (_, lobbyId: string) => {
        if (!client) throw new Error('Steam not initialized')
        try {
            console.log('Joining lobby:', lobbyId)
            currentLobby = await client.matchmaking.joinLobby(BigInt(lobbyId))



            return {
                id: currentLobby.id.toString(),
                owner: currentLobby.getOwner().steamId64.toString()
            }
        } catch (err) {
            console.error('Failed to join lobby:', err)
            throw err
        }
    })

    ipcMain.handle('steam-set-lobby-data', async (_, key: string, value: string) => {
        if (!currentLobby) throw new Error('Not in a lobby')
        try {
            return currentLobby.setData(key, value)
        } catch (err) {
            console.error('Failed to set lobby data:', err)
            return false
        }
    })

    ipcMain.handle('steam-leave-lobby', async () => {
        if (currentLobby) {
            console.log('Leaving lobby:', currentLobby.id)
            await currentLobby.leave()
            currentLobby = null
        }
    })

    ipcMain.handle('steam-get-lobby-members', async () => {
        if (!currentLobby) return []
        try {
            const members = currentLobby.getMembers()
            const memberData = []

            for (const m of members) {
                const steamId = m.steamId64
                // Filter out invalid IDs (zombie/ghost members)
                if (!steamId || steamId.toString() === '0') continue

                let name = steamId.toString()

                // Get name for local player
                if (client.localplayer && steamId === client.localplayer.getSteamId().steamId64) {
                    name = client.localplayer.getName()
                } else {
                    // Try to get member data if available
                    // Note: requestLobbyMemberData is not available in this steamworks.js version
                    // We rely on Steam's auto-sync or what's already cached
                    try {
                        const personaName = currentLobby.getMemberData(steamId, 'name')
                        if (personaName) {
                            name = personaName
                        }
                    } catch (e) {
                        // Ignore errors fetching member data
                    }
                }

                memberData.push({
                    id: steamId.toString(),
                    name: name
                })
            }

            return memberData
        } catch (err) {
            console.error('Failed to get lobby members:', err)
            return []
        }
    })

    // --- Lobby Chat Handlers ---

    ipcMain.handle('steam-send-lobby-chat', async (_, message: string) => {
        if (!currentLobby) throw new Error('Not in a lobby')
        try {
            // Send chat message to all lobby members via Steam
            const success = currentLobby.sendChatMsg(message)
            if (!success) {
                console.error('Failed to send lobby chat message')
            }
            return success
        } catch (err) {
            console.error('Error sending lobby chat:', err)
            throw err
        }
    })

    ipcMain.handle('steam-setup-lobby-chat-listener', async () => {
        if (!currentLobby || !client) return false

        try {
            // Listen for lobby chat messages
            // This uses Steam's callback system
            client.matchmaking.on('lobby-chat-message', (lobbyId: any, sender: any, message: string) => {
                if (currentLobby && lobbyId.toString() === currentLobby.id.toString()) {
                    // Get sender name
                    let senderName = sender.steamId64.toString()
                    if (client.localplayer && sender.steamId64 === client.localplayer.getSteamId().steamId64) {
                        senderName = client.localplayer.getName()
                    } else {
                        try {
                            const name = currentLobby.getMemberData(sender.steamId64, 'name')
                            if (name) senderName = name
                        } catch (e) { }
                    }

                    // Send to renderer process
                    const windows = BrowserWindow.getAllWindows()
                    if (windows.length > 0) {
                        windows[0].webContents.send('lobby-chat-message', {
                            senderId: sender.steamId64.toString(),
                            senderName: senderName,
                            message: message,
                            timestamp: new Date().toISOString()
                        })
                    }
                }
            })
            return true
        } catch (err) {
            console.error('Error setting up lobby chat listener:', err)
            return false
        }
    })
}

export function getGameInstallDir(): string | null {
    if (!client) {
        console.error('getGameInstallDir: Client is null')
        return null
    }
    try {
        console.log('getGameInstallDir: Attempting to get install dir for 40970')
        const dir = client.apps.appInstallDir(40970)
        console.log('getGameInstallDir: Result:', dir)
        return dir
    } catch (err) {
        console.error('getGameInstallDir: Failed to get install dir:', err)
        return null
    }
}

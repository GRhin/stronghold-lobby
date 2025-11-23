import { ipcMain } from 'electron'
import steamworks from 'steamworks.js'

let client: any = null

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
}

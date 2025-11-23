import { ipcMain } from 'electron'
import steamworks from 'steamworks.js'

let client: any = null

export function initSteam() {
    try {
        client = steamworks.init(40970) // Stronghold Crusader App ID
        console.log('Steam initialized:', client.localplayer.getName())
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
        const ticket = await client.auth.getAuthTicketForWebApi('LobbyClient')
        return ticket.getBytes().toString('hex')
    })
}

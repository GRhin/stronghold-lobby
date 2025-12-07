import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { socket } from '../socket'

interface SteamLobby {
    id: string
    owner: string
    name: string
    gameMode: 'crusader' | 'extreme'
    members: Array<{ id: string; name: string }>
}

interface SteamContextType {
    currentLobby: SteamLobby | null
    createLobby: (maxMembers?: number, lobbyName?: string, gameMode?: 'crusader' | 'extreme') => Promise<void>
    joinLobby: (lobbyId: string) => Promise<void>
    leaveLobby: () => Promise<void>
    refreshLobbyMembers: () => Promise<void>
    lobbies: Array<{ id: string; memberCount: number; maxMembers: number; name: string; gameMode: 'crusader' | 'extreme' }>
    refreshLobbies: () => Promise<void>
}

const SteamContext = createContext<SteamContextType | undefined>(undefined)

export const SteamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentLobby, setCurrentLobby] = useState<SteamLobby | null>(null)
    const [lobbies, setLobbies] = useState<Array<{ id: string; memberCount: number; maxMembers: number; name: string; gameMode: 'crusader' | 'extreme' }>>([])

    const refreshLobbyMembers = useCallback(async () => {
        if (!currentLobby) return
        try {
            const members = await window.electron.getLobbyMembers()
            setCurrentLobby(prev => prev ? { ...prev, members } : null)
        } catch (err) {
            console.error('Failed to refresh lobby members:', err)
        }
    }, [currentLobby?.id]) // Depend on ID to avoid stale closure issues if object changes

    const createLobby = useCallback(async (maxMembers: number = 8, lobbyName: string = 'Lobby', gameMode: 'crusader' | 'extreme' = 'crusader') => {
        try {
            const result = await window.electron.createLobby(maxMembers, lobbyName, gameMode)
            // Initialize with owner (self)
            const user = await window.electron.getSteamUser()
            const initialMembers = user ? [{ id: user.steamId, name: user.name }] : []

            setCurrentLobby({
                id: result.id,
                owner: result.owner,
                name: result.name,
                gameMode: result.gameMode,
                members: initialMembers
            })

            // Notify server for game launch coordination
            socket.emit('steam:lobby_joined', result.id)
        } catch (err) {
            console.error('Failed to create lobby:', err)
            throw err
        }
    }, [])

    const joinLobby = useCallback(async (lobbyId: string) => {
        try {
            const result = await window.electron.joinLobby(lobbyId)
            setCurrentLobby({
                id: result.id,
                owner: result.owner,
                name: 'Lobby', // Will be fetched when we get lobby data
                gameMode: 'crusader', // Default until fetched
                members: [] // Will be populated by refresh
            })
            // Immediately fetch members
            const members = await window.electron.getLobbyMembers()
            setCurrentLobby(prev => prev ? { ...prev, members } : null)

            // Notify server for game launch coordination
            socket.emit('steam:lobby_joined', result.id)
        } catch (err) {
            console.error('Failed to join lobby:', err)
            throw err
        }
    }, [])

    const leaveLobby = useCallback(async () => {
        try {
            // Notify server before leaving
            if (currentLobby) {
                socket.emit('steam:lobby_left')
            }

            await window.electron.leaveLobby()
            setCurrentLobby(null)
        } catch (err) {
            console.error('Failed to leave lobby:', err)
        }
    }, [])

    const refreshLobbies = useCallback(async () => {
        try {
            const list = await window.electron.getLobbies()
            setLobbies(list)
        } catch (err) {
            console.error('Failed to get lobbies:', err)
        }
    }, [])

    // Poll for members if in a lobby
    useEffect(() => {
        if (!currentLobby) return

        const interval = setInterval(refreshLobbyMembers, 2000)
        return () => clearInterval(interval)
    }, [currentLobby?.id, refreshLobbyMembers])

    return (
        <SteamContext.Provider value={{
            currentLobby,
            createLobby,
            joinLobby,
            leaveLobby,
            refreshLobbyMembers,
            lobbies,
            refreshLobbies
        }}>
            {children}
        </SteamContext.Provider>
    )
}

export const useSteam = () => {
    const context = useContext(SteamContext)
    if (context === undefined) {
        throw new Error('useSteam must be used within a SteamProvider')
    }
    return context
}

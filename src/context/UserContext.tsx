import React, { createContext, useContext, useState, type ReactNode } from 'react'

interface SteamUser {
    name: string
    steamId: string
}

interface UserContextType {
    user: SteamUser | null
    setUser: (user: SteamUser | null) => void
    isServerConnected: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

import { socket } from '../socket'

// ...

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<SteamUser | null>(null)
    const [isServerConnected, setIsServerConnected] = useState(socket.connected)

    React.useEffect(() => {
        const handleConnect = () => {
            setIsServerConnected(true)
            if (user) {
                console.log('Socket reconnected, re-authenticating...')
                socket.emit('auth:login', user)
            }
        }

        const handleDisconnect = () => {
            setIsServerConnected(false)
        }

        const handleConnectError = (err: any) => {
            console.error('Socket connection error:', err)
            setIsServerConnected(false)
        }

        socket.on('connect', handleConnect)
        socket.on('disconnect', handleDisconnect)
        socket.on('connect_error', handleConnectError)

        // Also emit immediately if we set the user and socket is already connected
        if (user && socket.connected) {
            socket.emit('auth:login', user)
        }

        return () => {
            socket.off('connect', handleConnect)
            socket.off('disconnect', handleDisconnect)
            socket.off('connect_error', handleConnectError)
        }
    }, [user])

    return (
        <UserContext.Provider value={{ user, setUser, isServerConnected }}>
            {children}
        </UserContext.Provider>
    )
}

export const useUser = () => {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider')
    }
    return context
}

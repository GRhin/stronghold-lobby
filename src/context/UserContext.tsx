import React, { createContext, useContext, useState, type ReactNode } from 'react'

interface SteamUser {
    name: string
    steamId: string
}

interface UserContextType {
    user: SteamUser | null
    setUser: (user: SteamUser | null) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

import { socket } from '../socket'

// ...

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<SteamUser | null>(null)

    React.useEffect(() => {
        const handleConnect = () => {
            if (user) {
                console.log('Socket reconnected, re-authenticating...')
                socket.emit('auth:login', user)
            }
        }

        socket.on('connect', handleConnect)

        // Also emit immediately if we set the user and socket is already connected
        if (user && socket.connected) {
            socket.emit('auth:login', user)
        }

        return () => {
            socket.off('connect', handleConnect)
        }
    }, [user])

    return (
        <UserContext.Provider value={{ user, setUser }}>
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

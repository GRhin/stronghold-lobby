import React, { createContext, useContext, useState, type ReactNode } from 'react'

interface LobbyInfo {
    id: string
    name: string
}

interface LobbyContextType {
    currentLobby: LobbyInfo | null
    setCurrentLobby: (lobby: LobbyInfo | null) => void
    clearCurrentLobby: () => void
}

const LobbyContext = createContext<LobbyContextType | undefined>(undefined)

export const LobbyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentLobby, setCurrentLobby] = useState<LobbyInfo | null>(null)

    const clearCurrentLobby = () => {
        setCurrentLobby(null)
    }

    return (
        <LobbyContext.Provider value={{ currentLobby, setCurrentLobby, clearCurrentLobby }}>
            {children}
        </LobbyContext.Provider>
    )
}

export const useLobby = () => {
    const context = useContext(LobbyContext)
    if (context === undefined) {
        throw new Error('useLobby must be used within a LobbyProvider')
    }
    return context
}

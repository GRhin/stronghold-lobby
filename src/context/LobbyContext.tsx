import React, { createContext, useContext, useState, type ReactNode } from 'react'

/**
 * LobbyInfo interface defines the minimal information about a lobby
 * that needs to be tracked globally across the application
 */
interface LobbyInfo {
    id: string      // Unique identifier for the lobby
    name: string    // Display name of the lobby
}

/**
 * LobbyContextType defines the shape of the context value
 * providing access to current lobby state and update functions
 */
interface LobbyContextType {
    currentLobby: LobbyInfo | null                      // Currently active lobby, null if not in any lobby
    setCurrentLobby: (lobby: LobbyInfo | null) => void  // Function to set/update current lobby
    clearCurrentLobby: () => void                       // Convenience function to clear current lobby
}

// Create the context with undefined as initial value (will be provided by LobbyProvider)
const LobbyContext = createContext<LobbyContextType | undefined>(undefined)

/**
 * LobbyProvider component wraps the application to provide lobby state
 * This allows any component to access and update the current lobby information
 */
export const LobbyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Track the current lobby the user is in (null if not in any lobby)
    const [currentLobby, setCurrentLobby] = useState<LobbyInfo | null>(null)

    /**
     * Helper function to clear the current lobby
     * This is called when the user leaves a lobby
     */
    const clearCurrentLobby = () => {
        setCurrentLobby(null)
    }

    return (
        <LobbyContext.Provider value={{ currentLobby, setCurrentLobby, clearCurrentLobby }}>
            {children}
        </LobbyContext.Provider>
    )
}

/**
 * Custom hook to access lobby context
 * Throws an error if used outside of LobbyProvider to catch misuse early
 * 
 * @returns LobbyContextType with current lobby state and update functions
 * @throws Error if used outside LobbyProvider
 */
export const useLobby = () => {
    const context = useContext(LobbyContext)

    // Ensure hook is used within LobbyProvider
    if (context === undefined) {
        throw new Error('useLobby must be used within a LobbyProvider')
    }

    return context
}

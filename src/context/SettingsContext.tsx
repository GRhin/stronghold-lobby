import React, { createContext, useContext, useState, useEffect } from 'react'

interface SettingsContextType {
    gamePath: string
    setGamePath: (path: string) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [gamePath, setGamePathState] = useState('')

    useEffect(() => {
        const savedPath = localStorage.getItem('stronghold_game_path')
        if (savedPath) {
            setGamePathState(savedPath)
        }
    }, [])

    const setGamePath = (path: string) => {
        setGamePathState(path)
        localStorage.setItem('stronghold_game_path', path)
    }

    return (
        <SettingsContext.Provider value={{ gamePath, setGamePath }}>
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = () => {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}

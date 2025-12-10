import React, { createContext, useContext, useState, useEffect } from 'react'

interface SettingsContextType {
    crusaderPath: string
    setCrusaderPath: (path: string) => void
    extremePath: string
    setExtremePath: (path: string) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [crusaderPath, setCrusaderPathState] = useState('')
    const [extremePath, setExtremePathState] = useState('')

    useEffect(() => {
        const savedCrusader = localStorage.getItem('stronghold_game_path')
        if (savedCrusader) setCrusaderPathState(savedCrusader)

        const savedExtreme = localStorage.getItem('stronghold_extreme_path')
        if (savedExtreme) setExtremePathState(savedExtreme)
    }, [])

    const setCrusaderPath = (path: string) => {
        setCrusaderPathState(path)
        localStorage.setItem('stronghold_game_path', path)
    }

    const setExtremePath = (path: string) => {
        setExtremePathState(path)
        localStorage.setItem('stronghold_extreme_path', path)
    }

    return (
        <SettingsContext.Provider value={{ crusaderPath, setCrusaderPath, extremePath, setExtremePath }}>
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

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { socket } from '../socket'

/**
 * Message interface matching the one in Chat.tsx
 */
export interface Message {
    id: string;
    user?: string;
    from?: string;
    to?: string;
    fromName?: string;
    text: string;
    timestamp: string;
    channel: 'global' | 'lobby' | 'whisper';
}

interface ChatContextType {
    globalMessages: Message[]
    addGlobalMessage: (msg: Message) => void
    lobbyMessages: Message[]
    addLobbyMessage: (msg: Message) => void
    clearLobbyMessages: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [globalMessages, setGlobalMessages] = useState<Message[]>([])
    const [lobbyMessages, setLobbyMessages] = useState<Message[]>([])

    // Limit to keeping the last 200 messages
    const MAX_MESSAGES = 200

    const addGlobalMessage = (msg: Message) => {
        setGlobalMessages(prev => {
            const updated = [...prev, msg]
            if (updated.length > MAX_MESSAGES) {
                return updated.slice(updated.length - MAX_MESSAGES)
            }
            return updated
        })
    }

    const addLobbyMessage = (msg: Message) => {
        setLobbyMessages(prev => {
            const updated = [...prev, msg]
            if (updated.length > MAX_MESSAGES) {
                return updated.slice(updated.length - MAX_MESSAGES)
            }
            return updated
        })
    }

    const clearLobbyMessages = () => {
        setLobbyMessages([])
    }

    useEffect(() => {
        const handleChatMessage = (msg: Message) => {
            if (msg.channel === 'global') {
                addGlobalMessage(msg)
            } else if (msg.channel === 'lobby') {
                addLobbyMessage(msg)
            }
        }

        socket.on('chat:message', handleChatMessage)

        return () => {
            socket.off('chat:message', handleChatMessage)
        }
    }, [])

    return (
        <ChatContext.Provider value={{ globalMessages, addGlobalMessage, lobbyMessages, addLobbyMessage, clearLobbyMessages }}>
            {children}
        </ChatContext.Provider>
    )
}

export const useChat = () => {
    const context = useContext(ChatContext)
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider')
    }
    return context
}

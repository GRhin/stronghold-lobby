import React, { useState, useEffect } from 'react'

import { socket } from '../socket'
import { useUser } from '../context/UserContext'

interface Message {
    id: string
    user: string
    text: string
    timestamp: string
    channel: 'global' | 'lobby' | 'whisper'
}

const Chat: React.FC = () => {
    const { user } = useUser()
    const [activeChannel, setActiveChannel] = useState<'global' | 'lobby'>('global')
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<Message[]>([])

    useEffect(() => {
        socket.on('chat:message', (msg: Message) => {
            setMessages((prev) => [...prev, msg])
        })

        return () => {
            socket.off('chat:message')
        }
    }, [])

    const handleSendMessage = () => {
        if (!message.trim()) return

        const newMessage: Message = {
            id: Date.now().toString(),
            user: user?.name || 'Unknown Lord',
            text: message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            channel: activeChannel
        }

        // Optimistic update
        // setMessages([...messages, newMessage]) 
        // Actually, let's wait for server echo for simplicity in this demo, or just emit
        socket.emit('chat:send', newMessage)
        setMessage('')
    }

    return (
        <div className="flex h-full gap-4">
            {/* Channels Sidebar */}
            <div className="w-48 flex flex-col gap-2">
                <h2 className="text-xl font-bold text-white mb-4">Channels</h2>
                <button
                    onClick={() => setActiveChannel('global')}
                    className={`text-left px-4 py-2 rounded transition-colors ${activeChannel === 'global' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:bg-white/5'}`}
                >
                    # Global
                </button>
                <button
                    onClick={() => setActiveChannel('lobby')}
                    className={`text-left px-4 py-2 rounded transition-colors ${activeChannel === 'lobby' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:bg-white/5'}`}
                >
                    # Lobby (Empty)
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-surface rounded-xl border border-white/5 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.filter(m => m.channel === activeChannel).map((msg) => (
                        <div key={msg.id} className="flex gap-3">
                            <div className="font-bold text-primary whitespace-nowrap">[{msg.timestamp}] {msg.user}:</div>
                            <div className="text-gray-300">{msg.text}</div>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="p-4 bg-black/20 border-t border-white/5 flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={`Message #${activeChannel}...`}
                        className="flex-1 bg-black/30 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSendMessage()
                            }
                        }}
                    />
                    <button
                        onClick={handleSendMessage}
                        className="px-6 py-2 bg-primary text-black font-bold rounded hover:bg-primary/90 transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Chat

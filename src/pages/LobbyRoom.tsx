import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

import { useUser } from '../context/UserContext'
import { useSteam } from '../context/SteamContext'
import { socket } from '../socket'

const LobbyRoom: React.FC = () => {
    const navigate = useNavigate()

    const { user } = useUser()
    const { currentLobby, leaveLobby } = useSteam()

    const [messages, setMessages] = useState<any[]>([])
    const [chatInput, setChatInput] = useState('')

    const isHost = currentLobby && user ? currentLobby.owner === user.steamId : false

    useEffect(() => {
        // Listen for chat messages from server
        socket.on('chat:message', (msg: any) => {
            if (msg.channel === 'lobby') {
                setMessages(prev => [...prev, msg])
            }
        })

        // Listen for game launch command from server
        socket.on('steam:game_launching', async (data: { isHost: boolean, lobbyId: string }) => {
            if (!currentLobby || data.lobbyId !== currentLobby.id) return

            try {
                const args = data.isHost ? '+lobby_host' : `+connect_lobby ${currentLobby.id}`
                console.log(data.isHost ? 'Host launching game...' : 'Auto-launching game as client...', args)
                await window.electron.launchSteamGame(args, currentLobby.gameMode)
            } catch (err) {
                console.error('Failed to auto-launch game:', err)
                alert('Failed to launch game')
            }
        })

        return () => {
            socket.off('chat:message')
            socket.off('steam:game_launching')
        }
    }, [currentLobby])

    const handleLeave = async () => {
        await leaveLobby()
        navigate('/lobbies')
    }

    const handleLaunch = async () => {
        if (!currentLobby || !isHost) return

        // Host triggers launch for everyone via server
        socket.emit('steam:game_launch', {
            steamLobbyId: currentLobby.id
        })
    }

    const handleSendChat = () => {
        if (!chatInput.trim() || !currentLobby || !user) return

        const message = {
            channel: 'lobby',
            steamLobbyId: currentLobby.id,
            user: user.name,
            text: chatInput,
            timestamp: new Date().toLocaleTimeString()
        }

        socket.emit('chat:send', message)
        setChatInput('')
    }

    if (!currentLobby) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-400 mb-4">Connecting to lobby...</p>
                <Button variant="secondary" onClick={() => navigate('/lobbies')}>Back to List</Button>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-white/5">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{currentLobby.name}</h1>
                    <p className="text-gray-400">Lobby ID: <span className="text-white">{currentLobby.id}</span></p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleLeave}>Leave Lobby</Button>
                    {isHost && (
                        <Button variant="primary" onClick={handleLaunch}>
                            Launch Game
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Player List */}
                <div className="w-1/3 bg-surface rounded-xl border border-white/5 p-4 flex flex-col">
                    <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Players</h2>
                    <div className="space-y-2 overflow-y-auto flex-1">
                        {currentLobby.members.map(player => (
                            <div key={player.id} className="flex items-center justify-between bg-black/20 p-3 rounded">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-200">{player.name}</span>
                                    {player.id === currentLobby.owner && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">HOST</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lobby Chat */}
                <div className="flex-1 bg-surface rounded-xl border border-white/5 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-black/20">
                        <h2 className="font-bold text-white">Lobby Chat</h2>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-2">
                        {messages.map((msg, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-gray-500 text-xs mt-1">[{msg.timestamp}]</span>
                                <span className="font-bold text-primary">{msg.user}:</span>
                                <span className="text-gray-300">{msg.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-black/20 border-t border-white/5 flex gap-2">
                        <input
                            type="text"
                            className="flex-1 bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                            placeholder="Type a message..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                        />
                        <Button variant="secondary" onClick={handleSendChat}>Send</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LobbyRoom

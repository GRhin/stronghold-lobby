import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ReportResultModal from '../components/ReportResultModal'
import { useSettings } from '../context/SettingsContext'
import { useUser } from '../context/UserContext'
import { socket } from '../socket'

interface Player {
    id: string
    name: string
    isHost: boolean
    rating?: number
}

interface Lobby {
    id: string
    name: string
    hostId: string
    hostIp: string
    map: string
    maxPlayers: number
    status: 'Open' | 'In Game'
    players: Player[]
    isRated: boolean
}

const LobbyRoom: React.FC = () => {
    const navigate = useNavigate()
    const { gamePath } = useSettings()
    const { user } = useUser()
    const [lobby, setLobby] = useState<Lobby | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [chatInput, setChatInput] = useState('')
    const [isHost, setIsHost] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const lobbyRef = useRef<Lobby | null>(null)

    useEffect(() => {
        lobbyRef.current = lobby
    }, [lobby])

    useEffect(() => {
        // Fetch current lobby state in case we missed the join event or refreshed
        socket.emit('lobby:get-current')

        // Listen for lobby updates
        socket.on('lobby:update', (updatedLobby: Lobby) => {
            setLobby(updatedLobby)
            setIsHost(updatedLobby.hostId === socket.id)
        })

        socket.on('lobby:joined', (joinedLobby: Lobby) => {
            setLobby(joinedLobby)
            setIsHost(joinedLobby.hostId === socket.id)
        })

        socket.on('chat:message', (msg: any) => {
            setMessages(prev => [...prev, msg])
        })

        socket.on('game:launch', async (data: { hostIp: string }) => {
            console.log('Launching game...', data)
            if (!gamePath) {
                alert('Game path not set! Cannot launch.')
                return
            }
            try {
                // @ts-ignore
                await window.electron.launchGame(gamePath, `-connect ${data.hostIp}`)
            } catch (err) {
                console.error('Failed to launch:', err)
                alert('Failed to launch game')
            }
        })

        // @ts-ignore
        const cleanupExit = window.electron.onGameExited((code) => {
            console.log('Game exited with code', code)
            const currentLobby = lobbyRef.current
            if (currentLobby && currentLobby.isRated && currentLobby.hostId === socket.id) {
                setShowReportModal(true)
            }
        })

        socket.on('lobby:notification', (msg: string) => {
            alert(msg)
        })

        socket.on('error', (err: string) => {
            if (err === 'Not in a lobby') {
                // If we are not in a lobby, go back to list
                navigate('/lobbies')
            }
        })

        return () => {
            socket.off('lobby:update')
            socket.off('lobby:joined')
            socket.off('chat:message')
            socket.off('game:launch')
            socket.off('lobby:notification')
            socket.off('error')
            cleanupExit()
        }
    }, [gamePath, navigate])

    const handleLeave = () => {
        socket.emit('lobby:leave')
        navigate('/lobbies')
    }

    const handleLaunch = () => {
        socket.emit('lobby:launch')
    }

    const handleSendChat = () => {
        if (!chatInput.trim()) return
        socket.emit('chat:send', {
            user: user?.name || 'Unknown Lord',
            text: chatInput,
            channel: 'lobby',
            timestamp: new Date().toLocaleTimeString()
        })
        setChatInput('')
    }

    if (!lobby) {
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
                    <h1 className="text-3xl font-bold text-white mb-1">{lobby.name}</h1>
                    <p className="text-gray-400">Map: <span className="text-white">{lobby.map}</span> • Status: <span className="text-primary">{lobby.status}</span></p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleLeave}>Leave Lobby</Button>
                    {isHost && (
                        <div className="flex gap-2">
                            <Button variant="primary" onClick={handleLaunch}>
                                Launch Game ({lobby.players.length}/{lobby.maxPlayers})
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Player List */}
                <div className="w-1/3 bg-surface rounded-xl border border-white/5 p-4 flex flex-col">
                    <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Players</h2>
                    <div className="space-y-2 overflow-y-auto flex-1">
                        {lobby.players.map(player => (
                            <div key={player.id} className="flex items-center justify-between bg-black/20 p-3 rounded">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-200">{player.name}</span>
                                    {player.rating && <span className="text-xs text-gray-500">({player.rating})</span>}
                                    {player.isHost && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">HOST</span>}
                                </div>
                                {isHost && !player.isHost && (
                                    <div className="flex gap-2">
                                        <button
                                            className="text-xs text-yellow-400 hover:text-yellow-300"
                                            onClick={() => socket.emit('lobby:transferHost', player.id)}
                                        >
                                            Make Host
                                        </button>
                                        <button className="text-xs text-red-400 hover:text-red-300">Kick</button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {Array.from({ length: lobby.maxPlayers - lobby.players.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="p-3 rounded border border-white/5 border-dashed text-gray-600 text-center text-sm">
                                Empty Slot
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

            <ReportResultModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                lobbyId={lobby.id}
                players={lobby.players}
            />
        </div>
    )
}

export default LobbyRoom

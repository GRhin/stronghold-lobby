import React, { useState, useEffect } from 'react'
import Button from '../components/Button'
import CreateLobbyModal from '../components/CreateLobbyModal'
import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
// import { socket } from '../socket'
import { useSteam } from '../context/SteamContext'

/*
interface Player {
    id: string
    name: string
    isHost: boolean
}

interface Lobby {
    id: string
    name: string
    hostId: string
    hostIp?: string
    map: string
    players: Player[]
    maxPlayers: number
    status: 'Open' | 'In Game'
    ping: number
    isRated: boolean
}
*/

const LobbyList: React.FC = () => {
    const navigate = useNavigate()
    // const [lobbies, setLobbies] = useState<Lobby[]>([])
    const [filter, setFilter] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const { isServerConnected } = useUser()
    const { lobbies, refreshLobbies, joinLobby, createLobby } = useSteam()

    useEffect(() => {
        refreshLobbies()
        const interval = setInterval(refreshLobbies, 5000)
        return () => clearInterval(interval)
    }, [refreshLobbies])

    /*
    useEffect(() => {
        // Request initial list
        socket.emit('lobby:list')

        // Listen for updates
        socket.on('lobby:list', (data: Lobby[]) => {
            setLobbies(data)
        })

        socket.on('lobby:joined', (_) => {
            console.log('Joined lobby, navigating to room...')
            navigate('/lobby')
        })

        socket.on('error', (err: string) => {
            alert(`Error: ${err}`)
        })

        return () => {
            socket.off('lobby:list')
            socket.off('lobby:joined')
            socket.off('error')
        }
    }, [gamePath, navigate])
    */

    const filteredLobbies = lobbies

    const handleJoin = async (lobbyId: string) => {
        try {
            await joinLobby(lobbyId)
            navigate('/lobby')
        } catch (err) {
            alert('Failed to join lobby')
        }
        /*
        socket.emit('lobby:join', {
            id: lobbyId,
            playerName: user?.name || 'Unknown Lord'
        })
        */
    }

    const handleCreate = () => {
        setShowCreateModal(true)
    }

    const handleCreateLobby = async (name: string, _isRated: boolean, gameMode: 'crusader' | 'extreme') => {
        try {
            await createLobby(8, name, gameMode, _isRated)
            navigate('/lobby')
        } catch (err) {
            console.error(err)
            alert('Failed to create lobby')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Lobby Browser</h1>
                    <p className="text-gray-400">Find a game or create your own kingdom.</p>
                </div>
                <Button variant="primary" className="shadow-lg shadow-primary/20" onClick={handleCreate}>
                    + Create Lobby
                </Button>
            </div>

            {/* Server Connection Warning */}
            {!isServerConnected && (
                <div className="bg-yellow-500/20 text-yellow-200 px-4 py-3 rounded border border-yellow-500/50 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="font-bold">Unable to connect to server</p>
                        <p className="text-sm">Elo ratings and custom lobbies are unavailable. You can still play via Steam.</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-4 bg-surface p-4 rounded-lg border border-white/5">
                <input
                    type="text"
                    placeholder="Search lobbies..."
                    className="bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary flex-1"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
                <select className="bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary">
                    <option>All Regions</option>
                    <option>Europe</option>
                    <option>North America</option>
                </select>
                <select className="bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary">
                    <option>Any Status</option>
                    <option>Open</option>
                    <option>In Game</option>
                </select>
            </div>

            {/* Lobby Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredLobbies.map((lobby) => {
                    // const hostName = lobby.players.find(p => p.isHost)?.name || 'Unknown'
                    return (
                        <div
                            key={lobby.id}
                            className="group bg-surface hover:bg-surface/80 border border-white/5 hover:border-primary/50 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer relative overflow-hidden"
                        >
                            {/* Status Indicator */}
                            <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-lg bg-green-500/20 text-green-400`}>
                                Open
                            </div>

                            <h3 className="text-xl font-bold text-primary mb-1 group-hover:text-white transition-colors">{lobby.name}</h3>
                            <p className="text-sm text-gray-400 mb-4">
                                Host: <span className="text-white">{lobby.ownerName || 'Unknown'}</span>
                            </p>

                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Players</span>
                                    <span className="text-gray-300">{lobby.memberCount} / {lobby.maxMembers}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Mode</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${lobby.gameMode === 'extreme' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {lobby.gameMode === 'extreme' ? '⚡ EXTREME' : '🏰 CRUSADER'}
                                    </span>
                                </div>
                                {/* @ts-ignore */}
                                {lobby.isInGame && (
                                    <div className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded text-center font-bold mt-2">
                                        IN GAME
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                // @ts-ignore
                                className={`w-full ${lobby.isInGame ? 'opacity-50 cursor-not-allowed' : 'group-hover:bg-primary group-hover:text-black group-hover:border-primary'}`}
                                // @ts-ignore
                                onClick={() => !lobby.isInGame && handleJoin(lobby.id)}
                                // @ts-ignore
                                disabled={lobby.isInGame}
                            >
                                {/* @ts-ignore */}
                                {lobby.isInGame ? 'In Game' : 'Join Game'}
                            </Button>
                        </div>
                    )
                })}
                {filteredLobbies.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        No Steam lobbies found. Create one to get started!
                    </div>
                )}
            </div>

            {/* Create Lobby Modal */}
            <CreateLobbyModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateLobby}
                defaultName={`Lobby ${Math.floor(Math.random() * 1000)}`}
            />
        </div>
    )
}

export default LobbyList

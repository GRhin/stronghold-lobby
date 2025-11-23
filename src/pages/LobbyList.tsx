import React, { useState, useEffect } from 'react'
import Button from '../components/Button'
import { io, Socket } from 'socket.io-client'
import { useSettings } from '../context/SettingsContext'

// Initialize socket outside component to avoid multiple connections
const socket: Socket = io('http://localhost:3001')

interface Lobby {
    id: string
    name: string
    host: string
    hostIp?: string
    map: string
    players: number
    maxPlayers: number
    status: 'Open' | 'In Game'
    ping: number
}

const LobbyList: React.FC = () => {
    const [lobbies, setLobbies] = useState<Lobby[]>([])
    const [filter, setFilter] = useState('')
    const { gamePath } = useSettings()

    useEffect(() => {
        // Request initial list
        socket.emit('lobby:list')

        // Listen for updates
        socket.on('lobby:list', (data: Lobby[]) => {
            setLobbies(data)
        })

        socket.on('lobby:joined', async (lobby: Lobby) => {
            if (!gamePath) {
                alert('Please configure your Game Path in Settings first!')
                return
            }

            alert(`Joined lobby: ${lobby.name}\nHost IP: ${lobby.hostIp}\nLaunching Game...`)

            try {
                // @ts-ignore
                await window.electron.launchGame(gamePath, `-connect ${lobby.hostIp}`)
                console.log(`Launching game connecting to ${lobby.hostIp}`)
            } catch (err) {
                alert('Failed to launch game: ' + err)
            }
        })

        socket.on('error', (err: string) => {
            alert(`Error: ${err}`)
        })

        return () => {
            socket.off('lobby:list')
            socket.off('lobby:joined')
            socket.off('error')
        }
    }, [gamePath])

    const filteredLobbies = lobbies.filter(lobby =>
        lobby.name.toLowerCase().includes(filter.toLowerCase()) ||
        lobby.host.toLowerCase().includes(filter.toLowerCase()) ||
        lobby.map.toLowerCase().includes(filter.toLowerCase())
    )

    const handleJoin = (lobbyId: string) => {
        socket.emit('lobby:join', lobbyId)
    }

    const handleCreate = () => {
        console.log('Create button clicked')
        // prompt() is not supported in Electron by default
        const name = `Lobby ${Math.floor(Math.random() * 1000)}`
        console.log('Lobby name generated:', name)
        if (name) {
            console.log('Emitting lobby:create')
            socket.emit('lobby:create', {
                name,
                host: 'Me', // TODO: Get real user name
                map: 'Green Valley',
                maxPlayers: 8
            })
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
                {filteredLobbies.map((lobby) => (
                    <div
                        key={lobby.id}
                        className="group bg-surface hover:bg-surface/80 border border-white/5 hover:border-primary/50 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer relative overflow-hidden"
                    >
                        {/* Status Indicator */}
                        <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-lg ${lobby.status === 'Open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                            {lobby.status}
                        </div>

                        <h3 className="text-xl font-bold text-primary mb-1 group-hover:text-white transition-colors">{lobby.name}</h3>
                        <p className="text-sm text-gray-400 mb-4">Host: <span className="text-white">{lobby.host}</span></p>

                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Map</span>
                                <span className="text-gray-300">{lobby.map}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Players</span>
                                <span className="text-gray-300">{lobby.players} / {lobby.maxPlayers}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Ping</span>
                                <span className={`font-mono ${lobby.ping < 50 ? 'text-green-500' : lobby.ping < 100 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {lobby.ping}ms
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full group-hover:bg-primary group-hover:text-black group-hover:border-primary"
                            onClick={() => handleJoin(lobby.id)}
                        >
                            Join Game
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default LobbyList

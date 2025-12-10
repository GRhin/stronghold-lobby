import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

import { useUser } from '../context/UserContext'
import { useSteam } from '../context/SteamContext'
import { useSettings } from '../context/SettingsContext'
import { socket } from '../socket'

const LobbyRoom: React.FC = () => {
    const navigate = useNavigate()

    const { user } = useUser()
    const { currentLobby, leaveLobby, createLobby, joinLobby } = useSteam()
    const { crusaderPath, extremePath } = useSettings()

    const [messages, setMessages] = useState<any[]>([])
    const [chatInput, setChatInput] = useState('')
    const [launchStatus, setLaunchStatus] = useState<string | null>(null)

    const isHost = currentLobby && user ? currentLobby.owner === user.steamId : false
    const pendingLobbyIdRef = React.useRef<string | null>(null)

    // Clear pending ID when currentLobby updates to match it
    useEffect(() => {
        if (currentLobby && currentLobby.id === pendingLobbyIdRef.current) {
            pendingLobbyIdRef.current = null
        }
    }, [currentLobby])

    useEffect(() => {
        // Listen for chat messages from server
        socket.on('chat:message', (msg: any) => {
            if (msg.channel === 'lobby') {
                setMessages(prev => [...prev, msg])
            }
        })

        // Listen for game launch command from server
        // Listen for game launch command from server
        socket.on('steam:game_launching', async (data: { isHost: boolean, lobbyId: string }) => {

            if (!currentLobby || data.lobbyId !== currentLobby.id) {
                return
            }

            // Cancel any pending fallback launch
            if ((window as any).__launchTimeoutId) {
                clearTimeout((window as any).__launchTimeoutId)
                    ; (window as any).__launchTimeoutId = null
            }
            if ((window as any).__launchReceived) {
                ; (window as any).__launchReceived()
                    ; (window as any).__launchReceived = null
            }

            try {
                // Host gets both arguments, joiner only gets connect_lobby
                const args = data.isHost
                    ? `+host_lobby +connect_lobby ${currentLobby.id}`
                    : `+connect_lobby ${currentLobby.id}`

                const launchGame = async () => {
                    setLaunchStatus('Launching game...')
                    const path = currentLobby.gameMode === 'extreme' ? extremePath : crusaderPath
                    const result = await window.electron.launchSteamGame(args, currentLobby.gameMode, path)
                    if (result && !result.success) {
                        setLaunchStatus(`Failed: ${result.error}`)
                        alert(`Failed to launch game: ${result.error}`)
                    } else {
                        setLaunchStatus('Game launched!')
                    }
                }

                if (data.isHost) {
                    // Host launches immediately
                    await launchGame()
                } else {
                    // Joiners wait 5 seconds to ensure host has initialized the lobby
                    setLaunchStatus('Host starting game... Launching in 5s...')
                    setTimeout(async () => {
                        await launchGame()
                    }, 5000)
                }

            } catch (err) {
                console.error('Failed to auto-launch game:', err)
                setLaunchStatus('Launch failed')
                alert('Failed to launch game')
            }
        })

        return () => {
            socket.off('chat:message')
            socket.off('steam:game_launching')
        }
    }, [currentLobby])

    // --- Persistent Lobby Logic ---

    // 1. Listen for Server Lobby updates (e.g., Steam ID changes) in currentLobby context?
    // Actually, LobbyRoom relies on 'currentLobby' from SteamContext which is purely local/steam state.
    // We need to listen to socket events for the *Server* lobby state to sync.
    // Wait, LobbyRoom is currently built purely around SteamContext.currentLobby.
    // To support persistence, we need to bridge the two.

    // Let's assume we are in a Server Lobby if `socket` has one.
    // Clear launch status when lobby changes
    useEffect(() => {
        setLaunchStatus(null)
    }, [currentLobby?.id])

    // 1. Listen for Server Lobby updates (e.g., Steam ID changes) in currentLobby context?
    // Actually, LobbyRoom relies on 'currentLobby' from SteamContext which is purely local/steam state.
    // We need to listen to socket events for the *Server* lobby state to sync.
    // Wait, LobbyRoom is currently built purely around SteamContext.currentLobby.
    // To support persistence, we need to bridge the two.

    // Let's assume we are in a Server Lobby if `socket` has one.
    // We need a way to know WHICH server lobby we are in.
    // The `LobbyProvider` (not used in this file yet) should track this.

    // For now, let's implement a listener for 'lobby:update' if we can determine we are in that lobby.
    useEffect(() => {
        const handleLobbyUpdate = async (updatedLobby: any) => {
            // Check if this update is for us
            // ideally we check if updatedLobby.steamLobbyId != currentSteamLobby.id
            if (!currentLobby) return

            // If WE are the host of the server lobby, we ignore updates because we act as the source of truth.
            // This prevents the host from trying to "join" a new lobby ID that it just created itself.
            if (updatedLobby.hostId === socket.id) return

            // If this update matches our pending lobby ID, we are already transitioning, so ignore.
            if (pendingLobbyIdRef.current && updatedLobby.steamLobbyId === pendingLobbyIdRef.current) return

            if (updatedLobby.steamLobbyId && updatedLobby.steamLobbyId !== currentLobby.id) {
                console.log('Persistent Lobby: Steam ID changed, moving to new lobby...', updatedLobby.steamLobbyId)
                try {
                    // Use Context method so UI updates
                    await joinLobby(updatedLobby.steamLobbyId)
                } catch (e) {
                    console.error('Failed to auto-join new steam lobby:', e)
                }
            }
        }

        socket.on('lobby:update', handleLobbyUpdate)
        return () => {
            socket.off('lobby:update', handleLobbyUpdate)
        }
    }, [currentLobby])

    // Listen for game exit to reset status
    useEffect(() => {
        const handleGameExit = async (code: number) => {
            console.log('Game exited with code:', code)
            setLaunchStatus(null)

            if (isHost && currentLobby) {
                // Reset lobby status to Open so it shows as joinable in browser
                try {
                    await window.electron.setLobbyData('status', 'Open')
                } catch (err) {
                    console.error('Failed to reset lobby status:', err)
                }
            }
        }

        window.electron.onGameExited(handleGameExit)
        return () => {
            window.electron.removeGameExitedListener(handleGameExit)
        }
    }, [isHost, currentLobby])

    // 2. Host Reform Logic
    // If we are Host, and we detect we aren't in a Steam lobby (but should be), recreate it.

    useEffect(() => {
        let isServerHost = false

        const recreateSteamLobby = async (serverLobby: any) => {
            try {
                console.log('Recreating Steam Lobby...')
                const name = serverLobby.name
                // Use Context method to ensure local state triggers immediately (skipServerCreate=true)
                const steamId = await createLobby(serverLobby.maxPlayers, name, 'crusader', true)
                pendingLobbyIdRef.current = steamId
                console.log('Steam Lobby Recreated:', steamId)

            } catch (err) {
                console.error('Failed to reform lobby:', err)
            }
        }

        const checkHost = (lobby: any) => {
            if (lobby && user && lobby.hostId === socket.id) {
                isServerHost = true

                const serverCount = lobby.players ? lobby.players.length : 1
                const steamCount = currentLobby ? currentLobby.members.length : 0

                const serverSteamId = lobby.steamLobbyId
                const currentSteamId = currentLobby ? currentLobby.id : null

                // 1. "Dead Lobby" check: currentLobby is null OR has 0 members
                const isLobbyDead = !currentLobby || steamCount === 0

                // 2. "Desync" check: Server has group (persistent), but Steam only has me (split/broken)
                const isLobbyDesync = serverCount > 1 && steamCount === 1

                // 3. "ID Mismatch" check: The lobby ID changed (e.g. game created new one), but Server has old one.
                const isIdMismatch = serverSteamId && currentSteamId && serverSteamId !== currentSteamId

                if (isIdMismatch && isServerHost) {
                    // Check if this mismatch is due to a pending update we initiated
                    if (pendingLobbyIdRef.current && serverSteamId === pendingLobbyIdRef.current) {
                        console.log('Host Reform: Ignoring mismatch due to pending state update')
                        return
                    }

                    console.log('Host Reform: ID Mismatch detected. Updating Server...')
                    // Only revert if we are SURE. If we have a pending ID, we assume logic elsewhere handles it.
                    if (!pendingLobbyIdRef.current) {
                        socket.emit('lobby:set_steam_id', { steamLobbyId: currentSteamId })
                    }
                    return // Exit to let update propagate
                }

                if ((isLobbyDead || isLobbyDesync) && isServerHost) {
                    console.log('Host Reform: Condition MET (Dead/Desync). Recreating...')
                    recreateSteamLobby(lobby)
                }
            }
        }

        socket.on('lobby:update', checkHost)
        socket.on('lobby:joined', checkHost)
        socket.emit('lobby:get-current')

        return () => {
            socket.off('lobby:update', checkHost)
            socket.off('lobby:joined', checkHost)
        }
    }, [currentLobby, user])

    const handleLeave = async () => {
        await leaveLobby()
        navigate('/lobbies')
    }

    const handleLaunch = async () => {
        if (!currentLobby || !isHost) return

        setLaunchStatus('Launching game...')

        // If socket is not connected, launch game directly without server coordination
        if (!socket.connected) {
            setLaunchStatus('Server offline - launching directly...')
            try {
                const args = `+host_lobby +connect_lobby ${currentLobby.id}`
                const path = currentLobby.gameMode === 'extreme' ? extremePath : crusaderPath
                const result = await window.electron.launchSteamGame(args, currentLobby.gameMode, path)
                if (result && !result.success) {
                    setLaunchStatus(`Error: ${result.error}`)
                    setTimeout(() => setLaunchStatus(null), 5000)
                    alert(`Failed to launch game: ${result.error}`)
                } else {
                    setLaunchStatus('Game launched!')
                    setTimeout(() => setLaunchStatus(null), 3000)
                }
            } catch (err) {
                console.error('Direct launch failed:', err)
                setLaunchStatus('Launch failed!')
                setTimeout(() => setLaunchStatus(null), 5000)
                alert('Failed to launch game')
            }
            return
        }

        // Set up timeout - if server doesn't respond in 2 seconds, launch directly
        let launchReceived = false
        const timeoutId = setTimeout(async () => {
            if (!launchReceived) {
                setLaunchStatus('Server timeout - launching directly...')
                try {
                    // Updated args for host
                    const args = `+host_lobby +connect_lobby ${currentLobby.id}`
                    const path = currentLobby.gameMode === 'extreme' ? extremePath : crusaderPath
                    const result = await window.electron.launchSteamGame(args, currentLobby.gameMode, path)
                    if (result && !result.success) {
                        setLaunchStatus(`Error: ${result.error}`)
                        setTimeout(() => setLaunchStatus(null), 5000)
                    } else {
                        setLaunchStatus('Game launched!')
                        setTimeout(() => setLaunchStatus(null), 3000)
                    }
                } catch (err) {
                    console.error('Timeout fallback launch failed:', err)
                    setLaunchStatus('Launch failed!')
                    setTimeout(() => setLaunchStatus(null), 5000)
                }
            }
        }, 2000)

            // Store timeout ID so we can clear it when we receive the launch event
            ; (window as any).__launchTimeoutId = timeoutId
            ; (window as any).__launchReceived = () => { launchReceived = true }

        // Host triggers launch for everyone via server
        socket.emit('steam:game_launch', {
            steamLobbyId: currentLobby.id
        })
        setLaunchStatus('Coordinating launch with server...')
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
                    {launchStatus && (
                        <div className="mt-2 px-3 py-1 bg-primary/20 text-primary rounded inline-block text-sm font-bold">
                            {launchStatus}
                        </div>
                    )}
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

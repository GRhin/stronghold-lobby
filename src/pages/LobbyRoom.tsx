import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ReportResultModal from '../components/ReportResultModal'

import { useUser } from '../context/UserContext'
import { useSteam } from '../context/SteamContext'
import { useSettings } from '../context/SettingsContext'
import { useChat } from '../context/ChatContext'
import { useSmartScroll } from '../hooks/useSmartScroll'
import { syncUCP, checkDiff, downloadUpdates, restoreBackups } from '../utils/ucp'
import type { FileDiff, UCPConfig } from '../utils/ucp'
import UCPSyncModal from '../components/UCPSyncModal'
import UCPModulesModal from '../components/UCPModulesModal'
import { socket } from '../socket'

const LobbyRoom: React.FC = () => {
    const navigate = useNavigate()

    const { user } = useUser()
    const { currentLobby, leaveLobby, createLobby, joinLobby } = useSteam()
    const { crusaderPath, extremePath } = useSettings()
    const { lobbyMessages, clearLobbyMessages } = useChat()
    const chatContainerRef = useSmartScroll(lobbyMessages)

    // Clear messages when joining a new lobby
    useEffect(() => {
        // If we have a current lobby but it's different from the one we have messages for?
        // Actually, we can just rely on manual clearing when leaving.
        // But if we join a new lobby directly (e.g. invite), we might want to clear.
        // For now, let's assume handleLeave covers most cases.
    }, [currentLobby?.id])

    const [chatInput, setChatInput] = useState('')
    const [launchStatus, setLaunchStatus] = useState<string | null>(null)
    const [serverLobby, setServerLobby] = useState<any>(null)
    const [showResultModal, setShowResultModal] = useState(false)
    const [hasCustomMod, setHasCustomMod] = useState(false)
    const [ucpModules, setUcpModules] = useState<Array<{ name: string, version: string, type: 'module' | 'plugin', size?: number }>>([])
    const [showModulesModal, setShowModulesModal] = useState(false)

    const isHost = currentLobby && user ? currentLobby.owner === user.steamId : false
    const pendingLobbyIdRef = React.useRef<string | null>(null)
    const isLeavingRef = React.useRef(false)

    // Clear pending ID when currentLobby updates to match it
    useEffect(() => {
        if (currentLobby && currentLobby.id === pendingLobbyIdRef.current) {
            pendingLobbyIdRef.current = null
        }
    }, [currentLobby])

    // Clear launch status when lobby changes
    useEffect(() => {
        setLaunchStatus(null)
    }, [currentLobby?.id])

    // 1. Socket Listeners (Game Launch)
    useEffect(() => {
        // NOTE: Chat messages are now handled in ChatContext globally

        // Listen for game launch command from server
        const handleGameLaunch = async (data: { isHost: boolean, lobbyId: string }) => {
            if (isLeavingRef.current) return

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
        }

        socket.on('steam:game_launching', handleGameLaunch)

        return () => {
            socket.off('steam:game_launching', handleGameLaunch)
        }
    }, [currentLobby, crusaderPath, extremePath])

    // 2. Persistent Lobby Logic (Auto-Join updated lobbies)
    useEffect(() => {
        const handleLobbyUpdate = async (updatedLobby: any) => {
            if (isLeavingRef.current) return

            // If WE are the host of the server lobby, we ignore updates because we act as the source of truth.
            if (updatedLobby.hostId === socket.id) return

            // If this update matches our pending lobby ID, we are already transitioning, so ignore.
            if (pendingLobbyIdRef.current && updatedLobby.steamLobbyId === pendingLobbyIdRef.current) return

            // Check if the server lobby has a Steam lobby ID
            if (updatedLobby.steamLobbyId) {
                // Case 1: We don't have a current lobby (it closed) - join the new one
                if (!currentLobby) {
                    console.log('Persistent Lobby: No current lobby, joining new lobby...', updatedLobby.steamLobbyId)
                    try {
                        await joinLobby(updatedLobby.steamLobbyId)
                    } catch (e) {
                        console.error('Failed to join new steam lobby:', e)
                    }
                    return
                }

                // Case 2: Our lobby is dead (0 members) - join the new one
                if (currentLobby.members.length === 0) {
                    console.log('Persistent Lobby: Current lobby is dead, joining new lobby...', updatedLobby.steamLobbyId)
                    try {
                        await joinLobby(updatedLobby.steamLobbyId)
                    } catch (e) {
                        console.error('Failed to join new steam lobby:', e)
                    }
                    return
                }

                // Case 3: Steam ID changed - move to new lobby
                if (updatedLobby.steamLobbyId !== currentLobby.id) {
                    console.log('Persistent Lobby: Steam ID changed, moving to new lobby...', updatedLobby.steamLobbyId)
                    try {
                        await joinLobby(updatedLobby.steamLobbyId)
                    } catch (e) {
                        console.error('Failed to auto-join new steam lobby:', e)
                    }
                }
            }
        }

        socket.on('lobby:update', handleLobbyUpdate)
        return () => {
            socket.off('lobby:update', handleLobbyUpdate)
        }
    }, [currentLobby, joinLobby])

    // 3. Game Exit Listener (Auto-Open / Result Reporting)
    useEffect(() => {
        const handleGameExit = async (code: number) => {
            if (isLeavingRef.current) return

            console.log('Game exited with code:', code)
            setLaunchStatus(null)

            if (isHost && currentLobby) {
                // If rated game, show reporting modal
                if (serverLobby?.isRated) {
                    setShowResultModal(true)
                } else {
                    // Reset lobby status to Open so it shows as joinable in browser
                    try {
                        await window.electron.setLobbyData('status', 'Open')
                    } catch (err) {
                        console.error('Failed to reset lobby status:', err)
                    }
                }
            }
        }

        window.electron.onGameExited(handleGameExit)
        return () => {
            window.electron.removeGameExitedListener(handleGameExit)
        }
    }, [isHost, currentLobby, serverLobby])

    // 4. Host Reform Logic (Auto-Recreate Dead Lobbies)
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
            if (isLeavingRef.current) return

            if (lobby) {
                setServerLobby(lobby)
            }
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
    }, [currentLobby, user, createLobby])

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to leave the lobby?')) return
        isLeavingRef.current = true

        // Restore UCP files if we synced
        if (!isHost) {
            const gamePath = currentLobby?.gameMode === 'extreme' ? extremePath : crusaderPath
            if (gamePath) {
                // We should probably track if we actually synced or not, but trying to restore 
                // harmlessly if backups exist is safer/easier.
                restoreBackups(gamePath).catch(err => console.error('Failed to restore UCP:', err))
            }
        }

        clearLobbyMessages()
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

    const [ucpStatus, setUcpStatus] = useState<string | null>(null)

    // Sync State
    const [syncDiffs, setSyncDiffs] = useState<FileDiff[]>([])
    const [showSyncModal, setShowSyncModal] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncStatus, setSyncStatus] = useState<string | null>(null)

    // Check UCP Sync
    const performSyncCheck = async () => {
        if (!serverLobby || isHost) return
        const gamePath = currentLobby?.gameMode === 'extreme' ? extremePath : crusaderPath
        if (!gamePath) return

        try {
            const diffs = await checkDiff(serverLobby.id, gamePath)
            if (diffs.length > 0) {
                setSyncDiffs(diffs)
                setShowSyncModal(true)
            }
        } catch (err) {
            console.error('Failed to check UCP sync:', err)
        }
    }

    useEffect(() => {
        if (serverLobby?.id && !isHost) {
            performSyncCheck()
        }

        const onUcpUpdate = async () => {
            console.log('Host updated UCP, checking...')
            setHasCustomMod(true) // Mark that custom mods are present

            // Fetch UCP config to get modules list
            if (serverLobby?.id) {
                try {
                    const response = await fetch(`${import.meta.env.DEV ? 'http://localhost:3000' : 'https://stronghold-lobby.onrender.com'}/api/lobby/${serverLobby.id}/file/ucp-config.yml`)
                    if (response.ok) {
                        const configText = await response.text()
                        const yaml = await import('js-yaml')
                        const config = yaml.load(configText) as UCPConfig
                        const loadOrder = config['config-full']?.['load-order'] || []
                        const modules = loadOrder.map(item => ({
                            name: item.extension,
                            version: item.version,
                            type: (config['config-full']?.modules?.[item.extension] ? 'module' : 'plugin') as 'module' | 'plugin'
                        }))
                        setUcpModules(modules)
                    }
                } catch (err) {
                    console.error('Failed to fetch UCP config:', err)
                }
            }

            performSyncCheck()
        }
        socket.on('ucp:updated', onUcpUpdate)
        return () => { socket.off('ucp:updated', onUcpUpdate) }
    }, [serverLobby?.id, isHost])

    const handleSyncConfirm = async () => {
        if (!serverLobby) return
        setIsSyncing(true)
        const gamePath = currentLobby?.gameMode === 'extreme' ? extremePath : crusaderPath
        if (!gamePath) return

        try {
            await downloadUpdates(serverLobby.id, gamePath, syncDiffs, setSyncStatus)
            setShowSyncModal(false)
            // alert('Synced!')
        } catch (err: any) {
            alert('Sync failed: ' + err.message)
        } finally {
            setIsSyncing(false)
            setSyncStatus(null)
        }
    }

    const handleUploadUCP = async () => {
        if (!serverLobby) return
        const gamePath = currentLobby?.gameMode === 'extreme' ? extremePath : crusaderPath
        if (!gamePath) {
            alert('Game path not configured!')
            return
        }

        try {
            setUcpStatus('Starting upload...')
            // Use serverLobby.id (Internal ID)
            await syncUCP(serverLobby.id, gamePath, setUcpStatus)
            setUcpStatus(null)
            alert('UCP Setup Uploaded Successfully!')
        } catch (err: any) {
            setUcpStatus('Error: ' + err.message)
            console.error(err)
        }
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
                    <h1 className="text-3xl font-bold text-white mb-1">
                        {currentLobby.name}
                        {hasCustomMod && (
                            <button
                                onClick={() => setShowModulesModal(true)}
                                className="ml-3 text-sm px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded-lg font-bold hover:bg-purple-500/30 hover:border-purple-500 transition-colors cursor-pointer"
                            >
                                🎮 Custom Mod ({ucpModules.length})
                            </button>
                        )}
                    </h1>
                    <p className="text-gray-400">Lobby ID: <span className="text-white">{currentLobby.id}</span></p>
                    {launchStatus && (
                        <div className="mt-2 px-3 py-1 bg-primary/20 text-primary rounded inline-block text-sm font-bold">
                            {launchStatus}
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleLeave}>Leave Lobby</Button>
                    {isHost && ((
                        <>
                            <Button variant="secondary" onClick={handleUploadUCP} disabled={!!ucpStatus}>
                                {ucpStatus || 'Upload UCP Config'}
                            </Button>
                            <Button variant="primary" onClick={handleLaunch}>
                                Launch Game
                            </Button>
                        </>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Player List */}
                <div className="w-1/3 bg-surface rounded-xl border border-white/5 p-4 flex flex-col">
                    <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Players</h2>
                    <div className="space-y-2 overflow-y-auto flex-1">
                        {currentLobby.members.map(player => {
                            // Try to find the real name from server lobby data if available
                            let displayName = player.name;
                            if (serverLobby && serverLobby.players) {
                                const serverPlayer = serverLobby.players.find((p: any) => p.steamId === player.id);
                                if (serverPlayer && serverPlayer.name && serverPlayer.name !== 'Unknown') {
                                    displayName = serverPlayer.name;
                                }
                            }

                            return (
                                <div key={player.id} className="flex items-center justify-between bg-black/20 p-3 rounded">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-200">{displayName}</span>
                                        {player.id === currentLobby.owner && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">HOST</span>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Lobby Chat */}
                <div className="flex-1 bg-surface rounded-xl border border-white/5 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-black/20">
                        <h2 className="font-bold text-white">Lobby Chat</h2>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-2">
                        {lobbyMessages.map((msg, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-gray-500 text-xs mt-1">[{msg.timestamp}]</span>
                                <span className="font-bold text-primary">{msg.user || msg.fromName}:</span>
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
                isOpen={showResultModal}
                onClose={() => setShowResultModal(false)}
                lobbyId={serverLobby?.id}
                players={serverLobby?.players || []}
            />

            <UCPSyncModal
                isOpen={showSyncModal}
                diffs={syncDiffs}
                onConfirm={handleSyncConfirm}
                onCancel={() => { setShowSyncModal(false); handleLeave(); }}
                isLoading={isSyncing}
                status={syncStatus}
            />

            {/* UCP Modules Modal */}
            <UCPModulesModal
                isOpen={showModulesModal}
                onClose={() => setShowModulesModal(false)}
                modules={ucpModules}
            />
        </div>
    )
}

export default LobbyRoom

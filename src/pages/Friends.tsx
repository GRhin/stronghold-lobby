import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { socket } from '../socket'
import { useUser } from '../context/UserContext'
import { useLobby } from '../context/LobbyContext'

/**
 * Friend interface represents a user in the friends list.
 * Includes online status and current lobby information.
 */
interface Friend {
    steamId: string                 // Unique Steam identifier
    name: string                    // Display name
    isOnline: boolean               // Online status
    currentLobbyId?: string | null  // ID of the lobby the friend is currently in (if any)
    currentLobbyName?: string | null // Name of the lobby the friend is currently in (if any)
}

/**
 * Request interface represents a pending friend request.
 */
interface Request {
    steamId: string // Unique Steam identifier of the requester
    name: string    // Display name of the requester
}

/**
 * Friends component manages the social aspects of the application.
 * It allows users to:
 * - View their friends list with online status and lobby location.
 * - Send and receive friend requests.
 * - Search for other users.
 * - Send direct messages.
 * - Invite friends to their lobby.
 * - Join friends' lobbies.
 */
const Friends: React.FC = () => {
    // ----- Global Context & Hooks -----------------------------------------
    const { user } = useUser()              // Current logged-in user
    const { currentLobby } = useLobby()     // Current lobby state
    const navigate = useNavigate()          // Navigation hook

    // ----- Local State ----------------------------------------------------
    // Active tab in the UI: 'friends', 'requests', or 'search'
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends')

    // List of current friends
    const [friends, setFriends] = useState<Friend[]>([])

    // List of pending friend requests
    const [requests, setRequests] = useState<Request[]>([])

    // Search results for user search
    const [searchResults, setSearchResults] = useState<Friend[]>([])

    // Current search query input
    const [searchQuery, setSearchQuery] = useState('')

    // Notification message (e.g., "Invitation sent!")
    const [notification, setNotification] = useState('')

    // ----- Effect: Socket Listeners ---------------------------------------
    useEffect(() => {
        // 1. Initial data fetch: Request friends list and pending requests
        socket.emit('friends:list')

        // 2. Register socket event listeners

        // Receive friends list and requests
        socket.on('friends:list', (data: { friends: Friend[], requests: Request[] }) => {
            setFriends(data.friends)
            setRequests(data.requests)
        })

        // Receive real-time status updates for friends (online/offline)
        socket.on('friend:status', (data: { steamId: string, isOnline: boolean }) => {
            setFriends(prev => prev.map(f =>
                f.steamId === data.steamId ? { ...f, isOnline: data.isOnline } : f
            ))
        })

        // Receive search results
        socket.on('user:search', (results: Friend[]) => {
            setSearchResults(results)
        })

        // Receive generic notifications
        socket.on('notification', (msg: string) => {
            setNotification(msg)
            // Clear notification after 3 seconds
            setTimeout(() => setNotification(''), 3000)
        })

        // Receive lobby invitations
        socket.on('lobby:invitation', (data: { from: string, lobbyId: string, lobbyName: string }) => {
            // Prompt user to accept invitation
            const accept = window.confirm(`${data.from} invited you to join "${data.lobbyName}". Accept?`)
            if (accept) {
                // Join the lobby if accepted
                socket.emit('lobby:join', { id: data.lobbyId, playerName: user?.name || 'Unknown Lord' })
                navigate('/lobby')
            }
        })

        // 3. Cleanup listeners on unmount
        return () => {
            socket.off('friends:list')
            socket.off('friend:status')
            socket.off('user:search')
            socket.off('notification')
            socket.off('lobby:invitation')
        }
    }, [navigate, user])

    // ----- Event Handlers -------------------------------------------------

    /**
     * Handles user search form submission.
     * Emits 'user:search' event if query length is sufficient.
     */
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.length >= 2) {
            socket.emit('user:search', searchQuery)
        }
    }

    /**
     * Sends a friend request to the target user.
     */
    const sendRequest = (targetId: string) => {
        socket.emit('friend:request', targetId)
    }

    /**
     * Accepts a pending friend request.
     */
    const acceptRequest = (targetId: string) => {
        socket.emit('friend:accept', targetId)
    }

    /**
     * Rejects a pending friend request.
     */
    const rejectRequest = (targetId: string) => {
        socket.emit('friend:reject', targetId)
    }

    /**
     * Navigates to the Chat page with the selected friend's context.
     * This opens a direct message conversation.
     */
    const handleMessage = (friendSteamId: string, friendName: string) => {
        navigate('/chat', { state: { friendSteamId, friendName } })
    }

    /**
     * Invites a friend to the current lobby.
     * Only works if the user is currently in a lobby.
     */
    const handleInviteToLobby = (friendSteamId: string) => {
        if (!currentLobby) return
        socket.emit('lobby:invite', { friendSteamId })
        setNotification('Invitation sent!')
        setTimeout(() => setNotification(''), 3000)
    }

    /**
     * Joins a friend's current lobby.
     * Prompts for confirmation if the user is already in another lobby.
     */
    const handleJoinFriendLobby = (friend: Friend) => {
        if (!friend.currentLobbyId) return

        // If already in a lobby, warn the user
        if (currentLobby) {
            const confirm = window.confirm(
                `You are currently in "${currentLobby.name}". Joining ${friend.name}'s lobby will make you leave your current lobby. Continue?`
            )
            if (!confirm) return
        }

        // Emit join event and navigate
        socket.emit('lobby:join', {
            id: friend.currentLobbyId,
            playerName: user?.name || 'Unknown Lord'
        })
        navigate('/lobby')
    }

    // ----- Render ---------------------------------------------------------
    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Social Hub</h1>
                    <p className="text-gray-400">Manage your alliances.</p>
                </div>
                {/* Notification Toast */}
                {notification && (
                    <div className="bg-green-500/20 text-green-200 px-4 py-2 rounded border border-green-500/50 animate-fade-in">
                        {notification}
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-1">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`pb-3 px-2 text-lg font-medium transition-colors relative ${activeTab === 'friends' ? 'text-primary' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    My Friends ({friends.length})
                    {activeTab === 'friends' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 px-2 text-lg font-medium transition-colors relative ${activeTab === 'requests' ? 'text-primary' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Requests ({requests.length})
                    {requests.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{requests.length}</span>}
                    {activeTab === 'requests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`pb-3 px-2 text-lg font-medium transition-colors relative ${activeTab === 'search' ? 'text-primary' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Find Users
                    {activeTab === 'search' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto pr-2">

                {/* Friends List Tab */}
                {activeTab === 'friends' && (
                    <div className="grid gap-3">
                        {friends.length === 0 && <div className="text-gray-500 text-center py-10">No friends yet. Go find some!</div>}
                        {friends.map(friend => (
                            <div key={friend.steamId} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    {/* Avatar & Status Indicator */}
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-300">
                                            {friend.name[0].toUpperCase()}
                                        </div>
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                    </div>

                                    {/* Friend Info */}
                                    <div>
                                        <h3 className="font-bold">{friend.name}</h3>
                                        <p className={`text-xs ${friend.isOnline ? 'text-green-400' : 'text-gray-500'}`}>
                                            {friend.isOnline ? 'Online' : 'Offline'}
                                        </p>
                                        {/* Lobby Status */}
                                        {friend.currentLobbyName && (
                                            <p className="text-xs text-primary mt-1">
                                                In: {friend.currentLobbyName}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        className="text-sm py-1 px-3"
                                        onClick={() => handleMessage(friend.steamId, friend.name)}
                                    >
                                        Message
                                    </Button>
                                    {/* Invite Button (only if user is in a lobby) */}
                                    {currentLobby && (
                                        <Button
                                            variant="outline"
                                            className="text-sm py-1 px-3"
                                            onClick={() => handleInviteToLobby(friend.steamId)}
                                        >
                                            Invite
                                        </Button>
                                    )}
                                    {/* Join Button (only if friend is in a lobby) */}
                                    {friend.currentLobbyId && (
                                        <Button
                                            variant="primary"
                                            className="text-sm py-1 px-3"
                                            onClick={() => handleJoinFriendLobby(friend)}
                                        >
                                            Join
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Friend Requests Tab */}
                {activeTab === 'requests' && (
                    <div className="grid gap-3">
                        {requests.length === 0 && <div className="text-gray-500 text-center py-10">No pending requests.</div>}
                        {requests.map(req => (
                            <div key={req.steamId} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-300">
                                        {req.name[0].toUpperCase()}
                                    </div>
                                    <h3 className="font-bold">{req.name}</h3>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="primary" className="text-sm py-1 px-3" onClick={() => acceptRequest(req.steamId)}>Accept</Button>
                                    <Button variant="outline" className="text-sm py-1 px-3" onClick={() => rejectRequest(req.steamId)}>Reject</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search Tab */}
                {activeTab === 'search' && (
                    <div>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by username..."
                                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50"
                            />
                            <Button type="submit" variant="primary">Search</Button>
                        </form>

                        <div className="grid gap-3">
                            {searchResults.map(res => (
                                <div key={res.steamId} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-300">
                                            {res.name[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold">{res.name}</h3>
                                            <p className={`text-xs ${res.isOnline ? 'text-green-400' : 'text-gray-500'}`}>
                                                {res.isOnline ? 'Online' : 'Offline'}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Add Friend Button (only if not already friends and not self) */}
                                    {res.steamId !== user?.steamId && (
                                        <Button
                                            variant="outline"
                                            className="text-sm py-1 px-3"
                                            onClick={() => sendRequest(res.steamId)}
                                            disabled={friends.some(f => f.steamId === res.steamId)}
                                        >
                                            {friends.some(f => f.steamId === res.steamId) ? 'Friends' : 'Add Friend'}
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Friends

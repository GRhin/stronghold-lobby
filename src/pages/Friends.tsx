import React, { useEffect, useState } from 'react'
import Button from '../components/Button'
import { socket } from '../socket'
import { useUser } from '../context/UserContext'

interface Friend {
    steamId: string
    name: string
    isOnline: boolean
}

interface Request {
    steamId: string
    name: string
}

const Friends: React.FC = () => {
    const { user } = useUser()
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends')
    const [friends, setFriends] = useState<Friend[]>([])
    const [requests, setRequests] = useState<Request[]>([])
    const [searchResults, setSearchResults] = useState<Friend[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [notification, setNotification] = useState('')

    useEffect(() => {
        // Initial fetch
        socket.emit('friends:list')

        // Listeners
        socket.on('friends:list', (data: { friends: Friend[], requests: Request[] }) => {
            setFriends(data.friends)
            setRequests(data.requests)
        })

        socket.on('friend:status', (data: { steamId: string, isOnline: boolean }) => {
            setFriends(prev => prev.map(f =>
                f.steamId === data.steamId ? { ...f, isOnline: data.isOnline } : f
            ))
        })

        socket.on('user:search', (results: Friend[]) => {
            setSearchResults(results)
        })

        socket.on('notification', (msg: string) => {
            setNotification(msg)
            setTimeout(() => setNotification(''), 3000)
        })

        return () => {
            socket.off('friends:list')
            socket.off('friend:status')
            socket.off('user:search')
            socket.off('notification')
        }
    }, [])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.length >= 2) {
            socket.emit('user:search', searchQuery)
        }
    }

    const sendRequest = (targetId: string) => {
        socket.emit('friend:request', targetId)
    }

    const acceptRequest = (targetId: string) => {
        socket.emit('friend:accept', targetId)
    }

    const rejectRequest = (targetId: string) => {
        socket.emit('friend:reject', targetId)
    }

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Social Hub</h1>
                    <p className="text-gray-400">Manage your alliances.</p>
                </div>
                {notification && (
                    <div className="bg-green-500/20 text-green-200 px-4 py-2 rounded border border-green-500/50 animate-fade-in">
                        {notification}
                    </div>
                )}
            </div>

            {/* Tabs */}
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-2">
                {activeTab === 'friends' && (
                    <div className="grid gap-3">
                        {friends.length === 0 && <div className="text-gray-500 text-center py-10">No friends yet. Go find some!</div>}
                        {friends.map(friend => (
                            <div key={friend.steamId} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-300">
                                            {friend.name[0].toUpperCase()}
                                        </div>
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{friend.name}</h3>
                                        <p className={`text-xs ${friend.isOnline ? 'text-green-400' : 'text-gray-500'}`}>
                                            {friend.isOnline ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="secondary" className="text-sm py-1 px-3">Message</Button>
                            </div>
                        ))}
                    </div>
                )}

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

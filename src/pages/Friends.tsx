import React from 'react'
import Button from '../components/Button'

interface Friend {
    id: string
    name: string
    status: 'online' | 'offline' | 'ingame'
    avatar: string
}

const MOCK_FRIENDS: Friend[] = [
    { id: '1', name: 'Sir William', status: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=William' },
    { id: '2', name: 'The Snake', status: 'ingame', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Snake' },
    { id: '3', name: 'Sultan', status: 'offline', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sultan' },
]

const Friends: React.FC = () => {
    const handleAddFriend = () => {
        alert('Add Friend dialog would open here.\n(Mock action)')
    }

    const handleMessage = (name: string) => {
        alert(`Opening chat with ${name}...\n(Mock action)`)
    }

    const handleInvite = (name: string) => {
        alert(`Invited ${name} to game!\n(Mock action)`)
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Friends List</h1>
                    <p className="text-gray-400">Manage your allies and rivals.</p>
                </div>
                <Button variant="outline" onClick={handleAddFriend}>
                    Add Friend
                </Button>
            </div>

            <div className="grid gap-4">
                {MOCK_FRIENDS.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full bg-gray-700" />
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${friend.status === 'online' ? 'bg-green-500' :
                                    friend.status === 'ingame' ? 'bg-yellow-500' : 'bg-gray-500'
                                    }`}></div>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{friend.name}</h3>
                                <p className={`text-sm ${friend.status === 'online' ? 'text-green-400' :
                                    friend.status === 'ingame' ? 'text-yellow-400' : 'text-gray-500'
                                    }`}>
                                    {friend.status === 'ingame' ? 'In Game: Desert Storm' :
                                        friend.status === 'online' ? 'Online' : 'Offline'}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="secondary" className="text-sm py-1 px-4" onClick={() => handleMessage(friend.name)}>
                                Message
                            </Button>
                            {friend.status !== 'ingame' && (
                                <Button variant="primary" className="text-sm py-1 px-4" onClick={() => handleInvite(friend.name)}>
                                    Invite
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Friends

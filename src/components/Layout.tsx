import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const Layout: React.FC = () => {
    const { user } = useUser()

    const navItems = [
        { name: 'Lobbies', path: '/lobbies', icon: '🏰' },
        { name: 'Friends', path: '/friends', icon: '👥' },
        { name: 'Chat', path: '/chat', icon: '💬' },
        { name: 'Settings', path: '/settings', icon: '⚙️' },
    ]

    return (
        <div className="flex h-screen bg-background text-white overflow-hidden">

            {/* Sidebar */}
            <aside className="w-64 bg-surface border-r border-white/10 flex flex-col">
                <div className="p-6 flex items-center gap-3 border-b border-white/10">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-black font-bold text-xl">
                        S
                    </div>
                    <div>
                        <h2 className="font-bold text-lg tracking-wide">Stronghold</h2>
                        <p className="text-xs text-gray-400">Lobby Client</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`
                            }
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User Profile Snippet */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-green-500"></div>
                        <div>
                            <p className="font-bold text-sm">{user?.name || 'Unknown Lord'}</p>
                            <p className="text-xs text-green-500">Online</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Drag Region */}
                <div className="h-8 w-full bg-transparent" style={{ WebkitAppRegion: 'drag' } as any}></div>

                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

export default Layout

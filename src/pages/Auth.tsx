import React, { useState } from 'react'
import Button from '../components/Button'
import { useNavigate } from 'react-router-dom'

const Auth: React.FC = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async () => {
        setLoading(true)
        setError('')
        try {
            // @ts-ignore
            const user = await window.electron.getSteamUser()
            if (user) {
                console.log('Steam User:', user)
                // @ts-ignore
                const ticket = await window.electron.getAuthTicket()
                console.log('Auth Ticket:', ticket)
                // Here we would send the ticket to our backend for verification
                navigate('/lobbies')
            } else {
                setError('Steam not running or not initialized.')
            }
        } catch (err: any) {
            console.error('Login failed:', err)
            setError('Login failed: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative flex flex-col items-center justify-center h-screen w-full overflow-hidden bg-background text-white">
            {/* Background Image / Overlay */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90 z-10"></div>
                <img
                    src="https://images7.alphacoders.com/337/337783.jpg"
                    alt="Stronghold Background"
                    className="w-full h-full object-cover opacity-50"
                />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center p-12 bg-surface/80 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl max-w-md w-full transform transition-all hover:scale-105 duration-500">
                <div className="mb-8 text-center">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-200 drop-shadow-lg font-serif tracking-wider">
                        CRUSADER
                    </h1>
                    <p className="text-gray-400 text-sm tracking-widest mt-2 uppercase">Multiplayer Lobby</p>
                </div>

                <div className="space-y-6 w-full">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <Button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full py-4 text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.002 16.75c-.365.365-1.057.365-1.422 0l-3.18-3.18c-.365-.365-.365-1.057 0-1.422l3.18-3.18c.365-.365 1.057-.365 1.422 0 .365.365.365 1.057 0 1.422l-3.18 3.18 3.18 3.18c-.365.365.365 1.057 0 1.422zM9.42 16.75L6.24 13.57c-.365-.365-.365-1.057 0-1.422l3.18-3.18c.365-.365 1.057-.365 1.422 0 .365.365.365 1.057 0 1.422l-3.18 3.18 3.18 3.18c-.365.365-1.057.365-1.422 0z" />
                        </svg>
                        {loading ? 'Connecting...' : 'Login with Steam'}
                    </Button>

                    <div className="text-center">
                        <p className="text-xs text-gray-500">
                            By logging in, you agree to the <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 text-gray-600 text-xs">
                v0.1.0-alpha
            </div>
        </div>
    )
}

export default Auth

import React, { useState, useEffect } from 'react'
import { socket } from '../socket'

const ConnectionOverlay: React.FC = () => {
    const [isConnected, setIsConnected] = useState(socket.connected)

    useEffect(() => {
        function onConnect() {
            setIsConnected(true)
        }

        function onDisconnect() {
            setIsConnected(false)
        }

        socket.on('connect', onConnect)
        socket.on('disconnect', onDisconnect)

        // Initial check
        setIsConnected(socket.connected)

        return () => {
            socket.off('connect', onConnect)
            socket.off('disconnect', onDisconnect)
        }
    }, [])

    if (isConnected) return null

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6 p-8 bg-surface rounded-xl border border-white/10 shadow-2xl max-w-md text-center">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Connecting to Server...</h2>
                    <p className="text-gray-400">
                        Please wait while we establish a connection.
                        <br />
                        <span className="text-sm opacity-70 mt-2 block">
                            (This may take up to a minute if the server is waking up)
                        </span>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ConnectionOverlay

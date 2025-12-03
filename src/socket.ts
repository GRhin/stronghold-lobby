import { io, Socket } from 'socket.io-client'

// Create a single socket instance for the entire application
export const socket: Socket = io('https://stronghold-lobby.onrender.com', {
    autoConnect: true,
    reconnection: true,
})

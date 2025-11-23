import { io, Socket } from 'socket.io-client'

// Create a single socket instance for the entire application
export const socket: Socket = io('http://localhost:3001', {
    autoConnect: true,
    reconnection: true,
})

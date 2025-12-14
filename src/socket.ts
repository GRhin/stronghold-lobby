import { io, Socket } from 'socket.io-client'

// Determine server URL based on environment
// In development (npm run dev), use localhost
// In production (built app), use Render server
const isDevelopment = import.meta.env.DEV
const SERVER_URL = isDevelopment
    ? 'http://localhost:3000'
    : 'https://stronghold-lobby.onrender.com'

console.log(`Connecting to server: ${SERVER_URL} (${isDevelopment ? 'Development' : 'Production'} mode)`)

// Create a single socket instance for the entire application
export const socket: Socket = io(SERVER_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 5000,
})

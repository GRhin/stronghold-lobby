const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
})

// State
let lobbies = []
// { id, name, host, map, players, maxPlayers, status, ping }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // --- Lobby Events ---

    // Get all lobbies
    socket.on('lobby:list', () => {
        socket.emit('lobby:list', lobbies)
    })

    // Create a lobby
    socket.on('lobby:create', (data) => {
        const newLobby = {
            id: Date.now().toString(),
            name: data.name,
            host: data.host,
            hostIp: socket.handshake.address === '::1' ? '127.0.0.1' : socket.handshake.address, // Capture IP
            map: data.map || 'Unknown',
            players: 1,
            maxPlayers: data.maxPlayers || 8,
            status: 'Open',
            ping: 0 // Mock ping
        }
        lobbies.push(newLobby)
        io.emit('lobby:list', lobbies) // Broadcast to all
        socket.join(newLobby.id)
        console.log('Lobby created:', newLobby)
    })

    // Join a lobby
    socket.on('lobby:join', (lobbyId) => {
        const lobby = lobbies.find(l => l.id === lobbyId)
        if (lobby && lobby.players < lobby.maxPlayers) {
            lobby.players++
            socket.join(lobbyId)
            io.emit('lobby:list', lobbies)
            socket.emit('lobby:joined', lobby)
            console.log(`User ${socket.id} joined lobby ${lobbyId}`)
        } else {
            socket.emit('error', 'Lobby full or not found')
        }
    })

    // --- Chat Events ---

    socket.on('chat:send', (data) => {
        // data: { user, text, channel, timestamp }
        if (data.channel === 'global') {
            io.emit('chat:message', data)
        } else if (data.channel === 'lobby') {
            // Get the lobby room the user is in
            // For simplicity, we assume the user is in only one lobby room which matches the lobby ID
            // In a real app, we'd track which lobby the user is in more explicitly
            const rooms = Array.from(socket.rooms)
            const lobbyRoom = rooms.find(r => r !== socket.id)
            if (lobbyRoom) {
                io.to(lobbyRoom).emit('chat:message', data)
            }
        }
    })

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
        // Handle user leaving lobby (simplified)
        // In a real app, we'd need to map socket.id to a user/lobby to decrement counts
    })
})

const PORT = 3001
server.listen(PORT, () => {
    console.log(`SERVER RUNNING on port ${PORT}`)
})

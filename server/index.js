const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development (supports multiple windows/ports)
        methods: ["GET", "POST"]
    }
})

// --- State ---
let lobbies = []
const USERS_FILE = path.join(__dirname, 'users.json')
let users = []

// Load users
try {
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
    }
} catch (err) {
    console.error('Failed to load users:', err)
}

function saveUsers() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
    } catch (err) {
        console.error('Failed to save users:', err)
    }
}

// Helper to find lobby by socket ID
const findLobbyBySocketId = (socketId) => {
    return lobbies.find(l => l.players.some(p => p.id === socketId))
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // --- Auth & User Management ---
    socket.on('auth:login', (steamUser) => {
        try {
            if (!steamUser || !steamUser.steamId) {
                console.error('Invalid steamUser received:', steamUser)
                return
            }

            // Store steamId on socket for robust lookup (even if multiple clients use same steamId)
            socket.steamId = steamUser.steamId

            let user = users.find(u => u.steamId === steamUser.steamId)
            if (!user) {
                // Register new user
                user = {
                    steamId: steamUser.steamId,
                    name: steamUser.name,
                    friends: [], // List of steamIds
                    requests: [], // List of steamIds (incoming)
                    socketId: socket.id,
                    isOnline: true,
                    rating: 1000
                }
                users.push(user)
                saveUsers()
                console.log('New user registered:', user.name)
            } else {
                // Update existing user
                user.name = steamUser.name // Update name if changed
                user.socketId = socket.id
                user.isOnline = true
                saveUsers()
                console.log('User logged in:', user.name)
            }

            // Broadcast online status to friends
            if (user.friends && Array.isArray(user.friends)) {
                user.friends.forEach(friendId => {
                    const friend = users.find(u => u.steamId === friendId)
                    if (friend && friend.socketId) {
                        io.to(friend.socketId).emit('friend:status', { steamId: user.steamId, isOnline: true })
                    }
                })
            }
        } catch (err) {
            console.error('Error in auth:login:', err)
        }
    })

    // --- Friend System ---

    // Get full data for my friends + requests
    socket.on('friends:list', () => {
        const user = users.find(u => u.socketId === socket.id)
        if (!user) return

        const myFriends = users.filter(u => user.friends.includes(u.steamId)).map(u => ({
            steamId: u.steamId,
            name: u.name,
            isOnline: u.isOnline
        }))

        const myRequests = users.filter(u => user.requests.includes(u.steamId)).map(u => ({
            steamId: u.steamId,
            name: u.name
        }))

        socket.emit('friends:list', { friends: myFriends, requests: myRequests })
    })

    // Search users by name
    socket.on('user:search', (query) => {
        if (!query || query.length < 2) return
        const results = users
            .filter(u => u.name.toLowerCase().includes(query.toLowerCase()) && u.socketId !== socket.id)
            .map(u => ({ steamId: u.steamId, name: u.name, isOnline: u.isOnline }))
            .slice(0, 10)
        socket.emit('user:search', results)
    })

    // Send Friend Request
    socket.on('friend:request', (targetSteamId) => {
        console.log(`[Friend Request] From ${socket.id} to ${targetSteamId}`)
        const sender = users.find(u => u.socketId === socket.id)
        const target = users.find(u => u.steamId === targetSteamId)

        if (!sender) {
            console.log('[Friend Request] Sender not found')
            return
        }
        if (!target) {
            console.log('[Friend Request] Target not found')
            return
        }

        console.log(`[Friend Request] Processing request from ${sender.name} to ${target.name}`)

        if (sender.friends.includes(target.steamId)) {
        }

    })

    // Accept Friend Request
    socket.on('friend:accept', (targetSteamId) => {
        const me = users.find(u => u.socketId === socket.id)
        const target = users.find(u => u.steamId === targetSteamId)

        if (!me || !target) return

        // Remove from requests
        me.requests = me.requests.filter(id => id !== targetSteamId)

        // Add to friends (both ways)
        if (!me.friends.includes(targetSteamId)) me.friends.push(targetSteamId)
        if (!target.friends.includes(me.steamId)) target.friends.push(me.steamId)

        saveUsers()

        // Notify both
        socket.emit('friends:list', {
            friends: users.filter(u => me.friends.includes(u.steamId)).map(u => ({ steamId: u.steamId, name: u.name, isOnline: u.isOnline })),
            requests: users.filter(u => me.requests.includes(u.steamId)).map(u => ({ steamId: u.steamId, name: u.name }))
        })

        if (target.socketId) {
            io.to(target.socketId).emit('friends:list', {
                friends: users.filter(u => target.friends.includes(u.steamId)).map(u => ({ steamId: u.steamId, name: u.name, isOnline: u.isOnline })),
                requests: users.filter(u => target.requests.includes(u.steamId)).map(u => ({ steamId: u.steamId, name: u.name }))
            })
            io.to(target.socketId).emit('notification', `${me.name} accepted your friend request!`)
        }
    })

    // Reject Friend Request
    socket.on('friend:reject', (targetSteamId) => {
        const me = users.find(u => u.socketId === socket.id)
        if (!me) return

        me.requests = me.requests.filter(id => id !== targetSteamId)
        saveUsers()

        socket.emit('friends:list', {
            friends: users.filter(u => me.friends.includes(u.steamId)).map(u => ({ steamId: u.steamId, name: u.name, isOnline: u.isOnline })),
            requests: users.filter(u => me.requests.includes(u.steamId)).map(u => ({ steamId: u.steamId, name: u.name }))
        })
    })

    // --- Lobby Events ---

    socket.on('lobby:list', () => {
        socket.emit('lobby:list', lobbies.map(l => ({
            ...l,
            playerCount: l.players.length // Send count for list view
        })))
    })

    socket.on('lobby:create', (data) => {
        // Leave current lobby if any
        const currentLobby = findLobbyBySocketId(socket.id)
        if (currentLobby) {
            handleLeaveLobby(socket)
        }

        const newLobby = {
            id: Date.now().toString(),
            name: data.name,
            hostId: socket.id,
            hostIp: socket.handshake.address === '::1' ? '127.0.0.1' : socket.handshake.address,
            map: data.map || 'Unknown',
            maxPlayers: data.maxPlayers || 8,
            isRated: !!data.isRated,
            status: 'Open',
            players: [{
                id: socket.id,
                steamId: socket.steamId || users.find(u => u.socketId === socket.id)?.steamId,
                name: data.hostName || 'Unknown Player',
                isHost: true,
                rating: users.find(u => u.steamId === (socket.steamId || users.find(u => u.socketId === socket.id)?.steamId))?.rating || 1000
            }]
        }
        lobbies.push(newLobby)
        socket.join(newLobby.id)

        // Broadcast update
        io.emit('lobby:list', lobbies)
        // Send full lobby details to creator
        socket.emit('lobby:joined', newLobby)

        console.log('Lobby created:', newLobby.name)
    })

    socket.on('lobby:join', (data) => {
        // data can be lobbyId or object
        const lobbyId = typeof data === 'object' ? data.id : data
        const playerName = typeof data === 'object' ? data.playerName : 'Unknown Player'

        const lobby = lobbies.find(l => l.id === lobbyId)

        if (!lobby) {
            socket.emit('error', 'Lobby not found')
            return
        }
        if (lobby.status !== 'Open') {
            socket.emit('error', 'Lobby is currently in game')
            return
        }
        if (lobby.players.length >= lobby.maxPlayers) {
            socket.emit('error', 'Lobby is full')
            return
        }

        // Leave current lobby if any
        const currentLobby = findLobbyBySocketId(socket.id)
        if (currentLobby) {
            if (currentLobby.id === lobbyId) return // Already in this lobby
            handleLeaveLobby(socket)
        }

        // Add player
        const newPlayer = {
            id: socket.id,
            steamId: socket.steamId || users.find(u => u.socketId === socket.id)?.steamId,
            name: playerName,
            isHost: false,
            rating: users.find(u => u.steamId === (socket.steamId || users.find(u => u.socketId === socket.id)?.steamId))?.rating || 1000
        }
        lobby.players.push(newPlayer)
        socket.join(lobbyId)

        // Notify everyone
        io.emit('lobby:list', lobbies) // Update list for outsiders
        io.to(lobbyId).emit('lobby:update', lobby) // Update room for insiders
        socket.emit('lobby:joined', lobby) // Tell joiner they are in

        console.log(`User ${playerName} joined lobby ${lobby.name}`)
    })

    socket.on('lobby:leave', () => {
        handleLeaveLobby(socket)
    })

    socket.on('lobby:launch', () => {
        const lobby = findLobbyBySocketId(socket.id)
        if (lobby && lobby.hostId === socket.id) {
            lobby.status = 'In Game'
            io.emit('lobby:list', lobbies) // Update list status
            io.to(lobby.id).emit('game:launch', {
                hostIp: lobby.hostIp,
                args: `-connect ${lobby.hostIp}`
            })
            console.log(`Lobby ${lobby.name} launched game`)
        }
    })

    socket.on('lobby:transferHost', (targetId) => {
        const lobby = findLobbyBySocketId(socket.id)
        if (lobby && lobby.hostId === socket.id) {
            const targetPlayer = lobby.players.find(p => p.id === targetId)
            if (targetPlayer) {
                // Remove host status from current host
                const currentHost = lobby.players.find(p => p.id === socket.id)
                if (currentHost) currentHost.isHost = false

                // Assign host status to new host
                targetPlayer.isHost = true
                lobby.hostId = targetPlayer.id

                // Notify everyone
                io.to(lobby.id).emit('lobby:update', lobby)
                io.to(lobby.id).emit('lobby:notification', `Host transferred to ${targetPlayer.name}`)
                io.emit('lobby:list', lobbies) // Update list if we showed host names there
                console.log(`Host transferred to ${targetPlayer.name} in lobby ${lobby.name}`)
            }
        }
    })

    socket.on('lobby:get-current', () => {
        const lobby = findLobbyBySocketId(socket.id)
        if (lobby) {
            socket.emit('lobby:joined', lobby)
        } else {
            socket.emit('error', 'Not in a lobby')
        }
    })

    // --- Game Results & Elo ---

    socket.on('game:report_result', (data) => {
        // data: { lobbyId, winnerId, loserId }
        const { lobbyId, winnerId, loserId } = data
        const lobby = lobbies.find(l => l.id === lobbyId)

        if (!lobby) return
        if (lobby.hostId !== socket.id) {
            console.log('Unauthorized result report attempt')
            return
        }
        if (!lobby.isRated) {
            console.log('Report ignored: Lobby is not rated')
            return
        }

        const winner = users.find(u => u.steamId === winnerId) // winnerId is steamId? Or socketId? Let's assume steamId or we need to map from lobby player id
        // Actually lobby players use socket.id as 'id'. But we need persistent user data.
        // Let's find the user objects based on the lobby player IDs (socket IDs)

        // Wait, the UI might send steamIds or socketIds. 
        // Let's assume the UI sends the 'id' from the player object in the lobby, which is socket.id.
        // We need to map that back to the persistent user.

        const winnerPlayer = lobby.players.find(p => p.id === winnerId)
        const loserPlayer = lobby.players.find(p => p.id === loserId)

        if (!winnerPlayer || !loserPlayer) {
            console.error('Winner or Loser not found in lobby')
            return
        }

        const winnerUser = users.find(u => u.steamId === winnerPlayer.steamId)
        const loserUser = users.find(u => u.steamId === loserPlayer.steamId)

        if (!winnerUser || !loserUser) {
            console.error('Winner or Loser user record not found (lookup by steamId)')
            return
        }

        // Calculate Elo
        const K = 32
        const rating1 = winnerUser.rating || 1000
        const rating2 = loserUser.rating || 1000

        const P1 = (1.0 / (1.0 + Math.pow(10, ((rating2 - rating1) / 400))))
        // P2 would be (1.0 / (1.0 + Math.pow(10, ((rating1 - rating2) / 400))))

        // Update ratings
        // Winner: Actual Score = 1
        // Loser: Actual Score = 0

        const newRating1 = Math.round(rating1 + K * (1 - P1))
        const newRating2 = Math.round(rating2 + K * (0 - (1 - P1))) // P2 = 1 - P1

        console.log(`Elo Update: ${winnerUser.name} (${rating1} -> ${newRating1}), ${loserUser.name} (${rating2} -> ${newRating2})`)

        winnerUser.rating = newRating1
        loserUser.rating = newRating2
        saveUsers()

        // Broadcast updates
        io.emit('user:update', { steamId: winnerUser.steamId, rating: newRating1 })
        io.emit('user:update', { steamId: loserUser.steamId, rating: newRating2 })

        // Notify lobby
        io.to(lobby.id).emit('lobby:notification', `Game Over! ${winnerUser.name} won against ${loserUser.name}. Ratings updated.`)

        // Reset lobby status to Open? Or keep In Game? Usually after result, back to lobby.
        lobby.status = 'Open'
        io.emit('lobby:list', lobbies)
        io.to(lobby.id).emit('lobby:update', lobby)
    })

    // --- Chat Events ---
    socket.on('chat:send', (data) => {
        if (data.channel === 'global') {
            io.emit('chat:message', data)
        } else if (data.channel === 'lobby') {
            const lobby = findLobbyBySocketId(socket.id)
            if (lobby) {
                io.to(lobby.id).emit('chat:message', data)
            }
        }
    })

    socket.on('disconnect', () => {
        const user = users.find(u => u.socketId === socket.id)
        if (user) {
            user.isOnline = false
            user.socketId = null
            console.log('User disconnected:', user.name)

            // Notify friends
            user.friends.forEach(friendId => {
                const friend = users.find(u => u.steamId === friendId)
                if (friend && friend.socketId) {
                    io.to(friend.socketId).emit('friend:status', { steamId: user.steamId, isOnline: false })
                }
            })
        }
        handleLeaveLobby(socket)
    })
})

function handleLeaveLobby(socket) {
    const lobby = findLobbyBySocketId(socket.id)
    if (!lobby) return

    // Remove player
    lobby.players = lobby.players.filter(p => p.id !== socket.id)
    socket.leave(lobby.id)

    if (lobby.players.length === 0) {
        // Lobby empty, destroy it
        lobbies = lobbies.filter(l => l.id !== lobby.id)
        io.emit('lobby:list', lobbies)
        console.log(`Lobby ${lobby.name} destroyed (empty)`)
    } else {
        // Handle host migration if needed
        if (lobby.hostId === socket.id) {
            const newHost = lobby.players[0]
            lobby.hostId = newHost.id
            newHost.isHost = true
            // Update host name in lobby list view if we tracked it there, 
            // but currently we just show list.
            io.to(lobby.id).emit('lobby:notification', `Host migrated to ${newHost.name}`)
            console.log(`Host migrated to ${newHost.name} in lobby ${lobby.name}`)
        }

        // Notify remaining players
        io.to(lobby.id).emit('lobby:update', lobby)
        io.emit('lobby:list', lobbies) // Update player counts
    }
}

const PORT = 3001
server.listen(PORT, () => {
    console.log(`SERVER RUNNING on port ${PORT}`)
})

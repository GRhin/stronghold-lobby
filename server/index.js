const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

// ----- Server Setup -------------------------------------------------------
const app = express()
app.use(cors()) // Enable CORS for all routes

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development (supports multiple windows/ports)
        methods: ["GET", "POST"]
    }
})

// ----- Global State -------------------------------------------------------
// In-memory storage for active lobbies
let lobbies = []

// Path to persistent user data file
const USERS_FILE = path.join(__dirname, 'users.json')

// In-memory storage for users (loaded from file)
let users = []

// In-memory storage for direct messages
// Structure: { conversationId: [Message Objects] }
let messages = {}

// ----- Data Persistence ---------------------------------------------------

/**
 * Load users from JSON file on startup.
 */
try {
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
    }
} catch (err) {
    console.error('Failed to load users:', err)
}

/**
 * Save current users state to JSON file.
 * Called whenever user data (like Elo rating or friends) changes.
 */
function saveUsers() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
    } catch (err) {
        console.error('Failed to save users:', err)
    }
}

// ----- Helper Functions ---------------------------------------------------

/**
 * Find the lobby that a specific socket (player) is currently in.
 * @param {string} socketId - The socket ID of the player.
 * @returns {object|undefined} The lobby object or undefined if not found.
 */
const findLobbyBySocketId = (socketId) => {
    return lobbies.find(l => l.players.some(p => p.id === socketId))
}

/**
 * Generate a consistent conversation ID for two users.
 * Sorts steamIds to ensure the ID is the same regardless of who is sender/recipient.
 * @param {string} steamId1 
 * @param {string} steamId2 
 * @returns {string} Unique conversation ID (e.g., "steam_123_steam_456")
 */
const getConversationId = (steamId1, steamId2) => {
    return [steamId1, steamId2].sort().join('_')
}

// ----- Socket.IO Event Handlers -------------------------------------------

io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // --- Auth & User Management ---

    /**
     * Handle user login.
     * Registers new users or updates existing ones.
     * Broadcasts online status to friends.
     */
    socket.on('auth:login', (steamUser) => {
        try {
            if (!steamUser || !steamUser.steamId) {
                console.error('Invalid steamUser received:', steamUser)
                return
            }

            // Store steamId on socket for robust lookup
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
                    rating: 1000 // Default Elo rating
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

    /**
     * Send the list of friends and pending requests to the user.
     * Includes online status and current lobby information for friends.
     */
    socket.on('friends:list', () => {
        const user = users.find(u => u.socketId === socket.id)
        if (!user) return

        // Map friends to include status and lobby info
        const myFriends = users.filter(u => user.friends.includes(u.steamId)).map(u => {
            const friendLobby = findLobbyBySocketId(u.socketId)
            return {
                steamId: u.steamId,
                name: u.name,
                isOnline: u.isOnline,
                currentLobbyId: friendLobby?.id || null,
                currentLobbyName: friendLobby?.name || null
            }
        })

        // Map requests to simple objects
        const myRequests = users.filter(u => user.requests.includes(u.steamId)).map(u => ({
            steamId: u.steamId,
            name: u.name
        }))

        socket.emit('friends:list', { friends: myFriends, requests: myRequests })
    })

    /**
     * Search for users by name.
     * Returns up to 10 matches.
     */
    socket.on('user:search', (query) => {
        if (!query || query.length < 2) return
        const results = users
            .filter(u => u.name.toLowerCase().includes(query.toLowerCase()) && u.socketId !== socket.id)
            .map(u => ({ steamId: u.steamId, name: u.name, isOnline: u.isOnline }))
            .slice(0, 10)
        socket.emit('user:search', results)
    })

    /**
     * Send a friend request to another user.
     */
    socket.on('friend:request', (targetSteamId) => {
        console.log(`[Friend Request] From ${socket.id} to ${targetSteamId}`)
        const sender = users.find(u => u.socketId === socket.id)
        const target = users.find(u => u.steamId === targetSteamId)

        if (!sender || !target) return

        // Check if already friends
        if (sender.friends.includes(target.steamId)) return

        // Check if already requested
        if (target.requests.includes(sender.steamId)) return

        // Add to target's requests
        target.requests.push(sender.steamId)
        saveUsers()

        // Notify target if online
        if (target.socketId) {
            io.to(target.socketId).emit('friends:list', {
                friends: users.filter(u => target.friends.includes(u.steamId)).map(u => ({ steamId: u.steamId, name: u.name, isOnline: u.isOnline })),
                requests: users.filter(u => target.requests.includes(u.steamId)).map(u => ({ steamId: u.steamId, name: u.name }))
            })
            io.to(target.socketId).emit('notification', `${sender.name} sent you a friend request!`)
        }
    })

    /**
     * Accept a friend request.
     */
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

        // Notify both users with updated lists
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

    /**
     * Reject a friend request.
     */
    socket.on('friend:reject', (targetSteamId) => {
        const me = users.find(u => u.socketId === socket.id)
        if (!me) return

        // Remove from requests
        me.requests = me.requests.filter(id => id !== targetSteamId)
        saveUsers()

        // Update my list
        socket.emit('friends:list', {
            friends: users.filter(u => me.friends.includes(u.steamId)).map(u => ({ steamId: u.steamId, name: u.name, isOnline: u.isOnline })),
            requests: users.filter(u => me.requests.includes(u.steamId)).map(u => ({ steamId: u.steamId, name: u.name }))
        })
    })

    // --- Direct Messaging ---

    /**
     * Send a direct message to a friend.
     */
    socket.on('message:send', (data) => {
        // data: { to: steamId, text: string }
        const sender = users.find(u => u.socketId === socket.id)
        const recipient = users.find(u => u.steamId === data.to)

        if (!sender || !recipient) return

        // Validate they are friends
        if (!sender.friends.includes(recipient.steamId)) {
            console.log('Message blocked: Not friends')
            return
        }

        const message = {
            id: Date.now().toString(),
            from: sender.steamId,
            to: recipient.steamId,
            fromName: sender.name,
            text: data.text,
            timestamp: new Date().toISOString()
        }

        // Store message in memory
        const conversationId = getConversationId(sender.steamId, recipient.steamId)
        if (!messages[conversationId]) {
            messages[conversationId] = []
        }
        messages[conversationId].push(message)

        // Send to recipient if online
        if (recipient.socketId) {
            io.to(recipient.socketId).emit('message:received', message)
        }

        // Echo back to sender (so they see it in their chat window)
        socket.emit('message:received', message)
    })

    /**
     * Retrieve message history for a conversation.
     */
    socket.on('message:history', (data) => {
        // data: { friendSteamId: string }
        const user = users.find(u => u.socketId === socket.id)
        if (!user) return

        const conversationId = getConversationId(user.steamId, data.friendSteamId)
        const history = messages[conversationId] || []

        socket.emit('message:history', { friendSteamId: data.friendSteamId, messages: history })
    })

    // --- Lobby Invitations ---

    /**
     * Invite a friend to the current lobby.
     */
    socket.on('lobby:invite', (data) => {
        // data: { friendSteamId: string }
        const sender = users.find(u => u.socketId === socket.id)
        const recipient = users.find(u => u.steamId === data.friendSteamId)
        const lobby = findLobbyBySocketId(socket.id)

        if (!sender || !recipient || !lobby) return

        // Validate they are friends
        if (!sender.friends.includes(recipient.steamId)) {
            console.log('Invite blocked: Not friends')
            return
        }

        // Send invitation to recipient if online
        if (recipient.socketId) {
            io.to(recipient.socketId).emit('lobby:invitation', {
                from: sender.name,
                fromSteamId: sender.steamId,
                lobbyId: lobby.id,
                lobbyName: lobby.name
            })
        }
    })

    /**
     * Join a friend's lobby directly.
     */
    socket.on('lobby:join_friend', (data) => {
        // data: { friendSteamId: string }
        const user = users.find(u => u.socketId === socket.id)
        const friend = users.find(u => u.steamId === data.friendSteamId)

        if (!user || !friend) return

        // Find friend's lobby
        const friendLobby = findLobbyBySocketId(friend.socketId)
        if (!friendLobby) {
            socket.emit('error', 'Friend is not in a lobby')
            return
        }

        // Join the lobby (re-uses existing join logic via client emission usually, 
        // but here we can trigger the join logic directly if we refactor, 
        // or just tell client to emit 'lobby:join'. 
        // The client implementation actually emits 'lobby:join' after this check, 
        // but this handler seems redundant if client handles it. 
        // Let's assume this is a server-side shortcut if used.)

        // Actually, looking at client code, it emits 'lobby:join' directly.
        // This handler might be unused or for a different flow. 
        // We'll leave it as a server-side join capability.

        // ... (Logic to join lobby would go here, similar to 'lobby:join')
    })

    // --- Lobby Events ---

    /**
     * Send list of all active lobbies.
     */
    socket.on('lobby:list', () => {
        socket.emit('lobby:list', lobbies.map(l => ({
            ...l,
            playerCount: l.players.length // Send count for list view
        })))
    })

    /**
     * Create a new lobby.
     */
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

    /**
     * Join an existing lobby.
     */
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

    /**
     * Leave the current lobby.
     */
    socket.on('lobby:leave', () => {
        handleLeaveLobby(socket)
    })

    /**
     * Launch the game (Host only).
     */
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

    /**
     * Transfer host status to another player.
     */
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
                io.emit('lobby:list', lobbies)
                console.log(`Host transferred to ${targetPlayer.name} in lobby ${lobby.name}`)
            }
        }
    })

    /**
     * Get details of the current lobby.
     */
    socket.on('lobby:get-current', () => {
        const lobby = findLobbyBySocketId(socket.id)
        if (lobby) {
            socket.emit('lobby:joined', lobby)
        } else {
            socket.emit('error', 'Not in a lobby')
        }
    })

    // --- Game Results & Elo ---

    /**
     * Report game result and update Elo ratings.
     * Only the host of a rated lobby can report results.
     */
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

        // Find players in the lobby
        const winnerPlayer = lobby.players.find(p => p.id === winnerId)
        const loserPlayer = lobby.players.find(p => p.id === loserId)

        if (!winnerPlayer || !loserPlayer) {
            console.error('Winner or Loser not found in lobby')
            return
        }

        // Find persistent user records
        const winnerUser = users.find(u => u.steamId === winnerPlayer.steamId)
        const loserUser = users.find(u => u.steamId === loserPlayer.steamId)

        if (!winnerUser || !loserUser) {
            console.error('Winner or Loser user record not found')
            return
        }

        // Calculate Elo
        const K = 32
        const rating1 = winnerUser.rating || 1000
        const rating2 = loserUser.rating || 1000

        const P1 = (1.0 / (1.0 + Math.pow(10, ((rating2 - rating1) / 400))))

        // Update ratings
        const newRating1 = Math.round(rating1 + K * (1 - P1))
        const newRating2 = Math.round(rating2 + K * (0 - (1 - P1)))

        console.log(`Elo Update: ${winnerUser.name} (${rating1} -> ${newRating1}), ${loserUser.name} (${rating2} -> ${newRating2})`)

        winnerUser.rating = newRating1
        loserUser.rating = newRating2
        saveUsers()

        // Broadcast updates
        io.emit('user:update', { steamId: winnerUser.steamId, rating: newRating1 })
        io.emit('user:update', { steamId: loserUser.steamId, rating: newRating2 })

        // Notify lobby
        io.to(lobby.id).emit('lobby:notification', `Game Over! ${winnerUser.name} won against ${loserUser.name}. Ratings updated.`)

        // Reset lobby status to Open
        lobby.status = 'Open'
        io.emit('lobby:list', lobbies)
        io.to(lobby.id).emit('lobby:update', lobby)
    })

    // --- Chat Events ---

    /**
     * Handle chat messages (Global and Lobby).
     */
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

    // --- Disconnect Handling ---

    /**
     * Handle user disconnection.
     * Updates online status, notifies friends, and leaves current lobby.
     */
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

/**
 * Handles logic for a user leaving a lobby.
 * Removes player, handles host migration, or destroys empty lobby.
 * @param {object} socket - The socket of the leaving user.
 */
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

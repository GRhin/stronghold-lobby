const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    steamId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    // List of steamIds of friends
    friends: [{
        type: String
    }],
    // List of steamIds of pending friend requests
    requests: [{
        type: String
    }],
    rating: {
        type: Number,
        default: 1000
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

// Add indexes for frequently queried fields
userSchema.index({ name: 'text' }) // For text search
userSchema.index({ friends: 1 }) // For friend lookups
userSchema.index({ requests: 1 }) // For request lookups


// Add method to publicize user object (hide internals if needed, though simpler is fine)
userSchema.methods.toPublic = function () {
    return {
        steamId: this.steamId,
        name: this.name,
        // Online status is not stored in DB, handled by server memory
        isOnline: false,
        rating: this.rating
    }
}

module.exports = mongoose.model('User', userSchema)

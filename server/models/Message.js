const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
})

// Index for efficient querying of conversation history
messageSchema.index({ from: 1, to: 1, timestamp: 1 })
messageSchema.index({ to: 1, from: 1, timestamp: 1 })

module.exports = mongoose.model('Message', messageSchema)

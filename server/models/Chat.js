// ===== CHAT & MESSAGE MODELS =====
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderName: {
        type: String,
        default: 'User'
    },
    text: {
        type: String,
        required: true,
        maxlength: 2000
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        default: null
    },
    type: {
        type: String,
        enum: ['booking', 'job_application'],
        default: 'booking'
    },
    messages: [messageSchema],
    lastMessage: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

export default mongoose.model('Chat', chatSchema);

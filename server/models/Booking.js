// ===== BOOKING MODEL =====
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    workerName: {
        type: String,
        default: null
    },
    category: {
        type: String,
        required: [true, 'Service category is required'],
        enum: ['plumber', 'electrician', 'cleaner', 'ac', 'carpenter', 'painter', 'mechanic', 'cook', 'driver', 'other']
    },
    description: {
        type: String,
        default: '',
        maxlength: 500
    },
    budget: {
        type: Number,
        required: true,
        min: 100
    },
    date: {
        type: String,
        default: ''
    },
    time: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid'],
        default: 'unpaid'
    },
    paymentAmount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

export default mongoose.model('Booking', bookingSchema);

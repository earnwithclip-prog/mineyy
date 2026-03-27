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
    userPhone: {
        type: String,
        default: ''
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
    workerPhone: {
        type: String,
        default: ''
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
    scheduleType: {
        type: String,
        enum: ['immediate', 'later'],
        default: 'immediate'
    },
    date: {
        type: String,
        default: ''
    },
    time: {
        type: String,
        default: ''
    },
    // Location
    userLocation: {
        type: String,
        default: ''
    },
    userCoordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
    },
    workerCoordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    cancelledBy: {
        type: String,
        enum: ['user', 'worker', null],
        default: null
    },
    cancelReason: {
        type: String,
        default: ''
    },
    // Rating after completion
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    feedback: {
        type: String,
        default: ''
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

bookingSchema.index({ 'userCoordinates.lat': 1, 'userCoordinates.lng': 1 });

export default mongoose.model('Booking', bookingSchema);

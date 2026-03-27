// ===== APPLICATION MODEL =====
import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    seekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seekerName: {
        type: String,
        required: true
    },
    seekerEmail: {
        type: String,
        default: ''
    },
    seekerPhone: {
        type: String,
        default: ''
    },
    seekerExperience: {
        type: String,
        default: ''
    },
    seekerPhoto: {
        type: String,
        default: null
    },
    coverNote: {
        type: String,
        default: '',
        maxlength: 500
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Prevent duplicate applications
applicationSchema.index({ jobId: 1, seekerId: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);

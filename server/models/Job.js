// ===== JOB MODEL =====
import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employerName: {
        type: String,
        required: true
    },
    employerPhone: {
        type: String,
        default: ''
    },
    employerEmail: {
        type: String,
        default: ''
    },
    employerPhoto: {
        type: String,
        default: null
    },
    title: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true
    },
    openings: {
        type: Number,
        default: 1
    },
    // Schedule / Hours
    scheduleFrom: {
        type: String,
        default: '09:00'
    },
    scheduleTo: {
        type: String,
        default: '18:00'
    },
    workType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Shift-based', '24/7 Required'],
        default: 'Full-time'
    },
    leavePolicy: {
        type: String,
        enum: ['Weekly Off', 'No Leave', 'Flexible Leave'],
        default: 'Weekly Off'
    },
    salaryType: {
        type: String,
        enum: ['monthly', 'daily'],
        default: 'monthly'
    },
    salaryMin: {
        type: Number,
        default: 0
    },
    salaryMax: {
        type: Number,
        default: 0
    },
    experience: {
        type: String,
        default: 'Fresher'
    },
    benefits: [{ type: String }],
    description: {
        type: String,
        default: '',
        maxlength: 1000
    },
    // Location
    location: {
        type: String,
        default: ''
    },
    coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
    },
    joinDate: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'closed', 'filled'],
        default: 'active'
    },
    applicantCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Geospatial-friendly index on coordinates
jobSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });

export default mongoose.model('Job', jobSchema);

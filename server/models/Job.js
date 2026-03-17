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
    hours: {
        type: String,
        default: 'Full Time (8 hrs)'
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
    benefits: [{
        type: String
    }],
    location: {
        type: String,
        default: ''
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

export default mongoose.model('Job', jobSchema);

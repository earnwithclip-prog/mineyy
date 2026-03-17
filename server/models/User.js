// ===== USER MODEL =====
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    password: {
        type: String,
        minlength: [6, 'Password must be at least 6 characters'],
        default: null
    },
    googleId: {
        type: String,
        default: null,
        sparse: true
    },
    photoURL: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'worker'],
        default: 'user'
    },
    // Worker-specific fields
    skills: [{
        type: String,
        enum: ['plumber', 'electrician', 'cleaner', 'ac', 'carpenter', 'painter', 'mechanic', 'cook', 'driver', 'other']
    }],
    location: {
        type: String,
        default: ''
    },
    coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
    },
    pricePerHour: {
        type: Number,
        default: 300
    },
    rating: {
        type: Number,
        default: 4.5,
        min: 0,
        max: 5
    },
    totalJobs: {
        type: Number,
        default: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    bio: {
        type: String,
        default: '',
        maxlength: 300
    }
}, {
    timestamps: true
});

// Hash password before saving (only if password exists)
userSchema.pre('save', async function (next) {
    if (!this.password || !this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

export default mongoose.model('User', userSchema);

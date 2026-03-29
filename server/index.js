// ===== LOCALSERVE BACKEND SERVER =====
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import workerRoutes from './routes/workers.js';
import bookingRoutes from './routes/bookings.js';
import jobRoutes from './routes/jobs.js';
import chatRoutes from './routes/chats.js';
import notificationRoutes from './routes/notifications.js';
import locationRoutes from './routes/locations.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE =====
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ===== ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/locations', locationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// ===== CONNECT DB & START =====
async function start() {
    let mongoUri = process.env.MONGO_URI;
    let isInMemory = false;

    try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.log('⚠️  Local MongoDB not available, using in-memory MongoDB...');
        try {
            const { MongoMemoryServer } = await import('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            mongoUri = mongod.getUri();
            await mongoose.connect(mongoUri);
            console.log('✅ Connected to in-memory MongoDB');
            isInMemory = true;
        } catch (memErr) {
            console.error('❌ Could not start any MongoDB:', memErr.message);
            process.exit(1);
        }
    }

    if (isInMemory) {
        await seedDemoData();
    }

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 API available at http://localhost:${PORT}/api`);
    });
}

// ===== SEED DEMO DATA =====
async function seedDemoData() {
    const User = (await import('./models/User.js')).default;
    const Job = (await import('./models/Job.js')).default;
    const bcryptModule = await import('bcryptjs');
    const bcryptLib = bcryptModule.default || bcryptModule;
    const hashedPw = await bcryptLib.hash('Demo1234!', 10);

    const workers = [
        { name: 'Raju Kumar', email: 'raju@demo.com', password: hashedPw, role: 'worker', skills: ['plumber'], pricePerHour: 350, rating: 4.8, totalJobs: 234, isAvailable: true, location: 'Hyderabad', phone: '9876543210', coordinates: { lat: 17.3850, lng: 78.4867 } },
        { name: 'Suresh Reddy', email: 'suresh@demo.com', password: hashedPw, role: 'worker', skills: ['electrician'], pricePerHour: 400, rating: 4.9, totalJobs: 312, isAvailable: true, location: 'Secunderabad', phone: '9876543211', coordinates: { lat: 17.4399, lng: 78.4983 } },
        { name: 'Anita Sharma', email: 'anita@demo.com', password: hashedPw, role: 'worker', skills: ['cleaner'], pricePerHour: 250, rating: 4.7, totalJobs: 156, isAvailable: true, location: 'Jubilee Hills', phone: '9876543212', coordinates: { lat: 17.4156, lng: 78.4100 } },
        { name: 'Mohan Das', email: 'mohan@demo.com', password: hashedPw, role: 'worker', skills: ['ac'], pricePerHour: 500, rating: 4.6, totalJobs: 198, isAvailable: false, location: 'Banjara Hills', phone: '9876543213', coordinates: { lat: 17.4239, lng: 78.4738 } },
        { name: 'Priya Patel', email: 'priya@demo.com', password: hashedPw, role: 'worker', skills: ['carpenter', 'painter'], pricePerHour: 450, rating: 4.8, totalJobs: 89, isAvailable: true, location: 'Kukatpally', phone: '9876543214', coordinates: { lat: 17.4849, lng: 78.3997 } },
        { name: 'Vikram Singh', email: 'vikram@demo.com', password: hashedPw, role: 'worker', skills: ['mechanic', 'plumber'], pricePerHour: 380, rating: 4.5, totalJobs: 145, isAvailable: true, location: 'Hyderabad', phone: '9876543215', coordinates: { lat: 17.3900, lng: 78.5000 } },
    ];

    const employer = await User.create({ name: 'Sharma Electronics', email: 'employer@demo.com', password: hashedPw, role: 'user', location: 'Hyderabad', phone: '9000000001' });

    for (const w of workers) {
        await User.create(w);
    }

    const jobs = [
        {
            title: 'Salesman', employerId: employer._id, employerName: 'Sharma Electronics',
            employerPhone: '9000000001', employerEmail: 'employer@demo.com',
            openings: 3, workType: 'Full-time', leavePolicy: 'Weekly Off',
            scheduleFrom: '09:00', scheduleTo: '18:00', salaryType: 'monthly',
            salaryMin: 12000, salaryMax: 15000, experience: 'Fresher',
            benefits: ['🍽️ Food Provided', '📅 Paid Leaves', '🎯 Bonus'],
            description: 'Looking for an energetic salesman to manage retail operations and customer interactions.',
            location: 'Hyderabad', coordinates: { lat: 17.3850, lng: 78.4867 }, joinDate: '',
            status: 'active'
        },
        {
            title: 'Delivery Boy', employerId: employer._id, employerName: 'QuickMart Store',
            employerPhone: '9000000001', employerEmail: 'employer@demo.com',
            openings: 5, workType: 'Full-time', leavePolicy: 'Weekly Off',
            scheduleFrom: '08:00', scheduleTo: '20:00', salaryType: 'monthly',
            salaryMin: 10000, salaryMax: 12000, experience: 'Fresher',
            benefits: ['🚌 Transport', '🏥 Health Insurance'],
            description: 'Delivery rider needed for local grocery and essentials delivery within 10 km radius.',
            location: 'Secunderabad', coordinates: { lat: 17.4399, lng: 78.4983 }, joinDate: '',
            status: 'active'
        },
        {
            title: 'Cook / Chef', employerId: employer._id, employerName: 'Spice Garden Restaurant',
            employerPhone: '9000000001', employerEmail: 'employer@demo.com',
            openings: 2, workType: 'Shift-based', leavePolicy: 'Flexible Leave',
            scheduleFrom: '07:00', scheduleTo: '15:00', salaryType: 'monthly',
            salaryMin: 15000, salaryMax: 20000, experience: '2-5 Years',
            benefits: ['🍽️ Food Provided', '🏠 Accommodation', '📅 Paid Leaves'],
            description: 'Experienced chef needed. Must know South Indian and North Indian cuisines. Accommodation provided.',
            location: 'Jubilee Hills', coordinates: { lat: 17.4156, lng: 78.4100 }, joinDate: '',
            status: 'active'
        },
    ];

    for (const j of jobs) {
        await Job.create(j);
    }

    console.log(`🌱 Seeded ${workers.length} workers + ${jobs.length} jobs`);
}

start();

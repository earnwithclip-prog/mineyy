// ===== SEED SCRIPT — Populate sample workers =====
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const sampleWorkers = [
    {
        name: 'Raju Kumar',
        email: 'raju@localserve.com',
        phone: '9876543210',
        password: 'worker123',
        role: 'worker',
        skills: ['plumber'],
        location: 'Hyderabad',
        coordinates: { lat: 17.390, lng: 78.480 },
        pricePerHour: 400,
        rating: 4.8,
        totalJobs: 156,
        isAvailable: true,
        bio: 'Expert plumber with 8+ years experience. Specializing in pipe fitting, leak repair, and bathroom renovation.'
    },
    {
        name: 'Suresh Mehta',
        email: 'suresh@localserve.com',
        phone: '9876543211',
        password: 'worker123',
        role: 'worker',
        skills: ['electrician'],
        location: 'Hyderabad',
        coordinates: { lat: 17.375, lng: 78.495 },
        pricePerHour: 450,
        rating: 4.9,
        totalJobs: 230,
        isAvailable: true,
        bio: 'Licensed electrician. Wiring, panel installations, fan/light fitting, and electrical safety inspections.'
    },
    {
        name: 'Anita Sharma',
        email: 'anita@localserve.com',
        phone: '9876543212',
        password: 'worker123',
        role: 'worker',
        skills: ['cleaner'],
        location: 'Hyderabad',
        coordinates: { lat: 17.395, lng: 78.470 },
        pricePerHour: 300,
        rating: 4.7,
        totalJobs: 89,
        isAvailable: true,
        bio: 'Professional home & office cleaning. Deep cleaning, move-in/move-out cleaning, and regular maintenance.'
    },
    {
        name: 'Mohan Das',
        email: 'mohan@localserve.com',
        phone: '9876543213',
        password: 'worker123',
        role: 'worker',
        skills: ['ac'],
        location: 'Hyderabad',
        coordinates: { lat: 17.380, lng: 78.500 },
        pricePerHour: 500,
        rating: 4.6,
        totalJobs: 67,
        isAvailable: true,
        bio: 'AC installation, repair, and maintenance. All brands supported. Gas refilling and deep cleaning.'
    },
    {
        name: 'Lakshmi Reddy',
        email: 'lakshmi@localserve.com',
        phone: '9876543214',
        password: 'worker123',
        role: 'worker',
        skills: ['painter'],
        location: 'Hyderabad',
        coordinates: { lat: 17.400, lng: 78.490 },
        pricePerHour: 350,
        rating: 4.8,
        totalJobs: 112,
        isAvailable: true,
        bio: 'Interior and exterior painting. Wall textures, waterproofing, and decorative finishes.'
    },
    {
        name: 'Vikram Singh',
        email: 'vikram@localserve.com',
        phone: '9876543215',
        password: 'worker123',
        role: 'worker',
        skills: ['carpenter'],
        location: 'Hyderabad',
        coordinates: { lat: 17.370, lng: 78.475 },
        pricePerHour: 450,
        rating: 4.5,
        totalJobs: 94,
        isAvailable: true,
        bio: 'Custom furniture, kitchen cabinets, door/window repair, and woodworking projects.'
    },
    {
        name: 'Priya Patel',
        email: 'priya@localserve.com',
        phone: '9876543216',
        password: 'worker123',
        role: 'worker',
        skills: ['cook'],
        location: 'Hyderabad',
        coordinates: { lat: 17.385, lng: 78.488 },
        pricePerHour: 350,
        rating: 4.9,
        totalJobs: 45,
        isAvailable: true,
        bio: 'Home cook specializing in South Indian, North Indian, and Continental cuisine. Meal prep and catering.'
    },
    {
        name: 'Ramesh Yadav',
        email: 'ramesh@localserve.com',
        phone: '9876543217',
        password: 'worker123',
        role: 'worker',
        skills: ['mechanic'],
        location: 'Hyderabad',
        coordinates: { lat: 17.392, lng: 78.465 },
        pricePerHour: 500,
        rating: 4.7,
        totalJobs: 178,
        isAvailable: true,
        bio: 'Automobile mechanic. Car/bike servicing, engine repair, brake system, and electrical diagnostics.'
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing workers
        await User.deleteMany({ role: 'worker' });
        console.log('🗑️  Cleared existing workers');

        // Hash passwords and insert
        const salt = await bcrypt.genSalt(10);
        for (const worker of sampleWorkers) {
            worker.password = await bcrypt.hash(worker.password, salt);
        }

        await User.insertMany(sampleWorkers);
        console.log(`✅ Inserted ${sampleWorkers.length} sample workers`);

        // Also create a demo user account
        const existingUser = await User.findOne({ email: 'demo@localserve.com' });
        if (!existingUser) {
            await User.create({
                name: 'Demo User',
                email: 'demo@localserve.com',
                phone: '9000000000',
                password: 'demo123',
                role: 'user'
            });
            console.log('✅ Created demo user (demo@localserve.com / demo123)');
        }

        console.log('\n🎉 Seeding complete! You can now start the server.');
        console.log('\n📧 Demo Login:');
        console.log('   Email: demo@localserve.com');
        console.log('   Password: demo123');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Seed error:', error.message);
        process.exit(1);
    }
}

seed();

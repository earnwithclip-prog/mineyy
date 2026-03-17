// ===== BOOKING ROUTES =====
import { Router } from 'express';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// POST /api/bookings — Create a booking (protected)
router.post('/', protect, async (req, res) => {
    try {
        const { category, description, budget, date, time, workerId } = req.body;

        if (!category || !budget) {
            return res.status(400).json({
                success: false,
                message: 'Category and budget are required.'
            });
        }

        const bookingData = {
            userId: req.user._id,
            userName: req.user.name,
            category,
            description: description || '',
            budget: parseInt(budget) || 500,
            date: date || '',
            time: time || '',
            status: 'pending'
        };

        // If a specific worker was selected
        if (workerId) {
            const worker = await User.findById(workerId);
            if (worker && worker.role === 'worker') {
                bookingData.workerId = worker._id;
                bookingData.workerName = worker.name;
                bookingData.status = 'confirmed';
            }
        }

        const booking = await Booking.create(bookingData);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully!',
            booking
        });
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking.'
        });
    }
});

// GET /api/bookings/my — Get current user's bookings (protected)
router.get('/my', protect, async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('workerId', 'name email phone rating skills');

        res.json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error('My bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings.'
        });
    }
});

// GET /api/bookings/worker — Get bookings assigned to current worker (protected)
router.get('/worker', protect, async (req, res) => {
    try {
        if (req.user.role !== 'worker') {
            return res.status(403).json({
                success: false,
                message: 'Only workers can view worker bookings.'
            });
        }

        const bookings = await Booking.find({
            $or: [
                { workerId: req.user._id },
                { status: 'pending', category: { $in: req.user.skills } }
            ]
        })
            .sort({ createdAt: -1 })
            .populate('userId', 'name email phone');

        res.json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error('Worker bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings.'
        });
    }
});

// GET /api/bookings/pending — Get all pending bookings (public for demo)
router.get('/pending', async (req, res) => {
    try {
        const bookings = await Booking.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending bookings.'
        });
    }
});

// PATCH /api/bookings/:id/status — Update booking status (protected)
router.patch('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['confirmed', 'in-progress', 'completed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Use: ' + validStatuses.join(', ')
            });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found.'
            });
        }

        // Workers can accept (confirm) pending bookings
        if (status === 'confirmed' && req.user.role === 'worker' && !booking.workerId) {
            booking.workerId = req.user._id;
            booking.workerName = req.user.name;
        }

        booking.status = status;
        await booking.save();

        // Update worker's total jobs count on completion
        if (status === 'completed' && booking.workerId) {
            await User.findByIdAndUpdate(booking.workerId, {
                $inc: { totalJobs: 1 }
            });
        }

        res.json({
            success: true,
            message: `Booking ${status}!`,
            booking
        });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking.'
        });
    }
});

// POST /api/bookings/:id/pay — Mock payment (protected)
router.post('/:id/pay', protect, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found.'
            });
        }

        // Verify the booking belongs to this user
        if (booking.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to pay for this booking.'
            });
        }

        // Simulate payment processing (mock)
        booking.paymentStatus = 'paid';
        booking.paymentAmount = booking.budget;
        booking.status = 'completed';
        await booking.save();

        res.json({
            success: true,
            message: '💳 Payment successful! ₹' + booking.budget + ' paid.',
            booking
        });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment failed. Please try again.'
        });
    }
});

export default router;

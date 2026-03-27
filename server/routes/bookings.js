// ===== BOOKING ROUTES =====
import { Router } from 'express';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import { protect } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = Router();

// Haversine distance in KM
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /api/bookings — Create a booking (protected)
router.post('/', protect, async (req, res) => {
    try {
        const { category, description, budget, scheduleType, date, time, workerId, userCoordinates, userLocation } = req.body;
        if (!category || !budget) {
            return res.status(400).json({ success: false, message: 'Category and budget are required.' });
        }

        const user = await User.findById(req.user._id);

        const bookingData = {
            userId: req.user._id,
            userName: req.user.name,
            userPhone: user?.phone || '',
            category,
            description: description || '',
            budget: parseInt(budget) || 500,
            scheduleType: scheduleType || 'immediate',
            date: date || '',
            time: time || '',
            userLocation: userLocation || '',
            userCoordinates: userCoordinates || { lat: 0, lng: 0 },
            status: 'pending'
        };

        if (workerId) {
            const worker = await User.findById(workerId);
            if (worker && worker.role === 'worker') {
                bookingData.workerId = worker._id;
                bookingData.workerName = worker.name;
                bookingData.workerPhone = worker.phone || '';
                bookingData.status = 'confirmed';
            }
        }

        const booking = await Booking.create(bookingData);

        if (bookingData.workerId) {
            await createNotification(
                bookingData.workerId,
                'booking_created',
                `📋 ${req.user.name} booked you for ${category} service`,
                booking._id.toString(),
                req.user.name
            );
        } else {
            // Notify all available nearby workers with matching skill
            const radius = 10; // KM
            const uLat = bookingData.userCoordinates.lat;
            const uLng = bookingData.userCoordinates.lng;
            const workers = await User.find({ role: 'worker', isAvailable: true, skills: category });
            for (const w of workers) {
                const wLat = w.coordinates?.lat || 0;
                const wLng = w.coordinates?.lng || 0;
                if (wLat === 0 && wLng === 0) {
                    // Worker has no coordinates — still notify if no radius filter
                    await createNotification(w._id, 'booking_created', `🔔 New ${category} job request nearby! Budget: ₹${budget}`, booking._id.toString(), req.user.name);
                } else {
                    const dist = haversineKm(uLat, uLng, wLat, wLng);
                    if (dist <= radius) {
                        await createNotification(w._id, 'booking_created', `🔔 New ${category} job ${dist.toFixed(1)}km away! Budget: ₹${budget}`, booking._id.toString(), req.user.name);
                    }
                }
            }
        }

        res.status(201).json({ success: true, message: 'Booking created! Nearby workers notified.', booking });
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ success: false, message: 'Failed to create booking.' });
    }
});

// GET /api/bookings/my — Get current user's bookings (protected)
router.get('/my', protect, async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('workerId', 'name email phone rating skills');
        res.json({ success: true, count: bookings.length, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
    }
});

// GET /api/bookings/worker — Get bookings assigned to current worker (protected)
router.get('/worker', protect, async (req, res) => {
    try {
        if (req.user.role !== 'worker') {
            return res.status(403).json({ success: false, message: 'Only workers can view worker bookings.' });
        }
        const bookings = await Booking.find({
            $or: [
                { workerId: req.user._id },
                { status: 'pending', category: { $in: req.user.skills } }
            ]
        }).sort({ createdAt: -1 }).populate('userId', 'name email phone');
        res.json({ success: true, count: bookings.length, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
    }
});

// GET /api/bookings/nearby — Radius-based pending bookings for workers
router.get('/nearby', protect, async (req, res) => {
    try {
        const { lat, lng, radius = 10, category } = req.query;
        const filter = { status: 'pending' };
        if (category) filter.category = category;

        let bookings = await Booking.find(filter)
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('userId', 'name email');

        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            const km = parseFloat(radius);

            bookings = bookings.map(b => {
                const bLat = b.userCoordinates?.lat || 0;
                const bLng = b.userCoordinates?.lng || 0;
                let distance = null;
                if (bLat !== 0 && bLng !== 0) {
                    distance = haversineKm(userLat, userLng, bLat, bLng);
                }
                return { ...b.toObject(), distance };
            }).filter(b => b.distance === null || b.distance <= km)
              .sort((a, b) => {
                   if (a.distance === null && b.distance === null) return 0;
                   if (a.distance === null) return 1;
                   if (b.distance === null) return -1;
                   return a.distance - b.distance;
              });
        } else {
            bookings = bookings.map(b => ({ ...b.toObject(), distance: null }));
        }

        res.json({ success: true, count: bookings.length, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch nearby bookings.' });
    }
});

// GET /api/bookings/pending — All pending bookings (public for demo)
router.get('/pending', async (req, res) => {
    try {
        const bookings = await Booking.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('userId', 'name email');
        res.json({ success: true, count: bookings.length, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch pending bookings.' });
    }
});

// PATCH /api/bookings/:id/status — Update booking status (protected)
router.patch('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['confirmed', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

        const worker = await User.findById(req.user._id);

        if (status === 'confirmed' && !booking.workerId) {
            booking.workerId = req.user._id;
            booking.workerName = req.user.name;
            booking.workerPhone = worker?.phone || '';
        }

        booking.status = status;
        await booking.save();

        let chatId = null;
        if (status === 'confirmed' && booking.workerId) {
            const existingChat = await Chat.findOne({
                participants: { $all: [booking.userId, booking.workerId] },
                bookingId: booking._id
            });
            if (existingChat) {
                chatId = existingChat._id;
            } else {
                const chat = await Chat.create({
                    participants: [booking.userId, booking.workerId],
                    bookingId: booking._id,
                    type: 'booking'
                });
                chatId = chat._id;
            }

            // Get user phone for worker
            const bookingUser = await User.findById(booking.userId);

            await createNotification(
                booking.userId,
                'booking_accepted',
                `✅ ${req.user.name} accepted your ${booking.category} booking! Phone: ${worker?.phone || 'see chat'}`,
                chatId.toString(),
                req.user.name
            );

            // Return contact info for both sides
            const contactInfo = {
                workerPhone: worker?.phone || '',
                workerEmail: worker?.email || '',
                userPhone: bookingUser?.phone || booking.userPhone || '',
                userEmail: bookingUser?.email || ''
            };

            return res.json({ success: true, message: 'Booking confirmed!', booking, chatId, contactInfo });
        }

        if (status === 'completed' && booking.workerId) {
            await User.findByIdAndUpdate(booking.workerId, { $inc: { totalJobs: 1 } });
        }

        res.json({ success: true, message: `Booking ${status}!`, booking, chatId });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update booking.' });
    }
});

// POST /api/bookings/:id/cancel — Cancel booking
router.post('/:id/cancel', protect, async (req, res) => {
    try {
        const { reason } = req.body;
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

        const isUser = booking.userId.toString() === req.user._id.toString();
        const isWorker = booking.workerId && booking.workerId.toString() === req.user._id.toString();

        if (!isUser && !isWorker) {
            return res.status(403).json({ success: false, message: 'Not authorized to cancel.' });
        }

        booking.status = 'cancelled';
        booking.cancelledBy = isUser ? 'user' : 'worker';
        booking.cancelReason = reason || '';
        await booking.save();

        // Notify the other party
        const notifyId = isUser ? booking.workerId : booking.userId;
        if (notifyId) {
            await createNotification(
                notifyId,
                'booking_created',
                `❌ Booking for "${booking.category}" was cancelled by ${isUser ? 'Customer' : 'Worker'}`,
                booking._id.toString(),
                req.user.name
            );
        }

        res.json({ success: true, message: 'Booking cancelled.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
    }
});

// POST /api/bookings/:id/rate — Rate worker after completion
router.post('/:id/rate', protect, async (req, res) => {
    try {
        const { rating, feedback } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be 1-5.' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
        if (booking.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only the customer can rate.' });
        }
        if (booking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Can only rate completed bookings.' });
        }

        booking.rating = rating;
        booking.feedback = feedback || '';
        await booking.save();

        // Update worker's average rating
        if (booking.workerId) {
            const workerBookings = await Booking.find({
                workerId: booking.workerId,
                rating: { $ne: null }
            });
            const avgRating = workerBookings.reduce((s, b) => s + b.rating, 0) / workerBookings.length;
            await User.findByIdAndUpdate(booking.workerId, { rating: Math.min(5, avgRating) });
        }

        res.json({ success: true, message: 'Thank you for your rating!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to submit rating.' });
    }
});

// PATCH /api/bookings/:id/complete — Mark work as done (user)
router.patch('/:id/complete', protect, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
        if (booking.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only customer can mark complete.' });
        }

        booking.status = 'completed';
        await booking.save();

        if (booking.workerId) {
            await User.findByIdAndUpdate(booking.workerId, { $inc: { totalJobs: 1 } });
            await createNotification(
                booking.workerId,
                'booking_accepted',
                `✅ ${req.user.name} marked "${booking.category}" job as completed!`,
                booking._id.toString(),
                req.user.name
            );
        }

        res.json({ success: true, message: 'Work marked as completed!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark complete.' });
    }
});

// POST /api/bookings/:id/pay — Mock payment (protected)
router.post('/:id/pay', protect, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
        if (booking.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }
        booking.paymentStatus = 'paid';
        booking.paymentAmount = booking.budget;
        booking.status = 'completed';
        await booking.save();
        res.json({ success: true, message: '💳 Payment successful! ₹' + booking.budget + ' paid.', booking });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Payment failed.' });
    }
});

export default router;

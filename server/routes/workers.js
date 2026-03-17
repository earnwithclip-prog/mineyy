// ===== WORKER ROUTES =====
import { Router } from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// GET /api/workers — List all workers (public)
router.get('/', async (req, res) => {
    try {
        const { category, search, available } = req.query;
        const filter = { role: 'worker' };

        // Filter by skill category
        if (category && category !== 'all') {
            filter.skills = { $in: [category] };
        }

        // Filter by availability
        if (available === 'true') {
            filter.isAvailable = true;
        }

        // Search by name
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const workers = await User.find(filter)
            .select('-password')
            .sort({ rating: -1, totalJobs: -1 })
            .limit(50);

        res.json({
            success: true,
            count: workers.length,
            workers
        });
    } catch (error) {
        console.error('Workers list error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch workers.'
        });
    }
});

// GET /api/workers/:id — Get single worker (public)
router.get('/:id', async (req, res) => {
    try {
        const worker = await User.findById(req.params.id).select('-password');
        if (!worker || worker.role !== 'worker') {
            return res.status(404).json({
                success: false,
                message: 'Worker not found.'
            });
        }

        res.json({ success: true, worker });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch worker.'
        });
    }
});

// PUT /api/workers/profile — Update worker profile (protected, worker only)
router.put('/profile', protect, async (req, res) => {
    try {
        if (req.user.role !== 'worker') {
            return res.status(403).json({
                success: false,
                message: 'Only workers can update worker profile.'
            });
        }

        const updates = {};
        const allowed = ['skills', 'pricePerHour', 'isAvailable', 'location', 'coordinates', 'bio'];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Worker profile updated!',
            worker: user
        });
    } catch (error) {
        console.error('Worker profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile.'
        });
    }
});

export default router;

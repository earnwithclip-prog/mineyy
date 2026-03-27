// ===== LOCATION ROUTES =====
import { Router } from 'express';
import Location from '../models/Location.js';
import Chat from '../models/Chat.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// POST /api/locations — Save my current location (worker, protected)
router.post('/', protect, async (req, res) => {
    try {
        const { lat, lng, accuracy } = req.body;
        if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required.' });

        const loc = await Location.findOneAndUpdate(
            { userId: req.user._id },
            { lat, lng, accuracy: accuracy || 0 },
            { upsert: true, new: true }
        );
        res.json({ success: true, location: loc });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to save location.' });
    }
});

// GET /api/locations/:userId — Get worker location (only if shared chat with requester)
router.get('/:userId', protect, async (req, res) => {
    try {
        const workerId = req.params.userId;
        const requesterId = req.user._id;

        // Verify they share an accepted chat
        const chat = await Chat.findOne({
            participants: { $all: [requesterId, workerId] }
        });
        if (!chat) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this location.' });
        }

        const loc = await Location.findOne({ userId: workerId });
        if (!loc) return res.status(404).json({ success: false, message: 'Location not available.' });

        res.json({ success: true, location: loc });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get location.' });
    }
});

export default router;

// ===== NOTIFICATION ROUTES =====
import { Router } from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications — Get my notifications (protected)
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(30);
        const unread = notifications.filter(n => !n.read).length;
        res.json({ success: true, count: notifications.length, unread, notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
    }
});

// PATCH /api/notifications/read-all — Mark all as read (protected)
router.patch('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark notifications as read.' });
    }
});

// PATCH /api/notifications/:id/read — Mark one as read (protected)
router.patch('/:id/read', protect, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: { read: true } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed.' });
    }
});

export default router;

// ===== HELPER: Create notification from anywhere =====
export async function createNotification(userId, type, text, refId = '', fromName = '') {
    try {
        await Notification.create({ userId, type, text, refId, fromName });
    } catch (e) {
        console.error('Create notification error:', e.message);
    }
}

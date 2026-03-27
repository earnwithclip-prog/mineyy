// ===== CHAT ROUTES =====
import { Router } from 'express';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = Router();

// GET /api/chats — List all chats for current user (protected)
router.get('/', protect, async (req, res) => {
    try {
        const chats = await Chat.find({ participants: req.user._id })
            .sort({ updatedAt: -1 })
            .populate('participants', 'name email photoURL');
        res.json({ success: true, count: chats.length, chats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch chats.' });
    }
});

// GET /api/chats/:id — Get chat with messages (protected)
router.get('/:id', protect, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id)
            .populate('participants', 'name email photoURL phone');
        if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

        const isParticipant = chat.participants.some(p => p._id.toString() === req.user._id.toString());
        if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized.' });

        // Return full participant info (including phone) since they are in this chat
        res.json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch chat.' });
    }
});

// GET /api/chats/:id/messages — Get messages (polling)
router.get('/:id/messages', protect, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

        const isParticipant = chat.participants.some(p => p.toString() === req.user._id.toString());
        if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized.' });

        const { after } = req.query;
        let messages = chat.messages || [];
        if (after) {
            const afterDate = new Date(after);
            messages = messages.filter(m => new Date(m.createdAt) > afterDate);
        }

        res.json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
    }
});

// POST /api/chats/:id/messages — Send a message (protected)
router.post('/:id/messages', protect, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Message text is required.' });

        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

        const isParticipant = chat.participants.some(p => p.toString() === req.user._id.toString());
        if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized.' });

        const message = {
            senderId: req.user._id,
            senderName: req.user.name,
            text: text.trim(),
            read: false
        };

        chat.messages.push(message);
        chat.lastMessage = text.trim();
        await chat.save();

        const saved = chat.messages[chat.messages.length - 1];

        // Notify the other participant
        const otherParticipants = chat.participants.filter(p => p.toString() !== req.user._id.toString());
        for (const recipientId of otherParticipants) {
            await createNotification(
                recipientId,
                'message',
                `💬 ${req.user.name}: ${text.trim().substring(0, 60)}${text.length > 60 ? '...' : ''}`,
                chat._id.toString(),
                req.user.name
            );
        }

        res.status(201).json({ success: true, message: saved });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
});

export default router;

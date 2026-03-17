// ===== CHAT ROUTES =====
import { Router } from 'express';
import Chat from '../models/Chat.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// GET /api/chats/:id — Get chat with messages (protected)
router.get('/:id', protect, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found.' });
        }

        // Verify participant
        const isParticipant = chat.participants.some(
            p => p.toString() === req.user._id.toString()
        );
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        res.json({ success: true, chat });
    } catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch chat.' });
    }
});

// GET /api/chats/:id/messages — Get messages (protected, supports polling)
router.get('/:id/messages', protect, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found.' });
        }

        const isParticipant = chat.participants.some(
            p => p.toString() === req.user._id.toString()
        );
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        // Support "after" query param for polling (ISO timestamp)
        const { after } = req.query;
        let messages = chat.messages || [];

        if (after) {
            const afterDate = new Date(after);
            messages = messages.filter(m => new Date(m.createdAt) > afterDate);
        }

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
    }
});

// POST /api/chats/:id/messages — Send a message (protected)
router.post('/:id/messages', protect, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: 'Message text is required.' });
        }

        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found.' });
        }

        const isParticipant = chat.participants.some(
            p => p.toString() === req.user._id.toString()
        );
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        const message = {
            senderId: req.user._id,
            senderName: req.user.name,
            text: text.trim(),
            read: false
        };

        chat.messages.push(message);
        chat.lastMessage = text.trim();
        await chat.save();

        // Return the saved message (last in array)
        const saved = chat.messages[chat.messages.length - 1];

        res.status(201).json({ success: true, message: saved });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
});

export default router;

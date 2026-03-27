// ===== NOTIFICATION MODEL =====
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['application', 'accepted', 'rejected', 'message', 'booking_accepted', 'booking_created'],
        required: true
    },
    text: { type: String, required: true },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
    fromName: { type: String, default: '' },
    refId: { type: String, default: '' } // chatId or bookingId or applicationId
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);

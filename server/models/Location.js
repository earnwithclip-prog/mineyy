// ===== LOCATION MODEL =====
import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Location', locationSchema);

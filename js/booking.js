// ===== BOOKING MODULE (Instant Services) =====
import { db } from './firebase.js';
import {
    collection, addDoc, doc, updateDoc, onSnapshot,
    query, where, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore';
import { requireAuth, showToast, getUser } from './auth.js';

// ===== CREATE BOOKING (Need Worker page) =====
export async function createBooking({ category, description, budget, date, time }) {
    const user = requireAuth();
    if (!user) return null;

    try {
        const bookingRef = await addDoc(collection(db, 'bookings'), {
            userId: user.uid,
            userName: user.displayName || 'User',
            userPhoto: user.photoURL || null,
            category,
            description: description || '',
            budget: parseInt(budget) || 500,
            preferredDate: date || '',
            preferredTime: time || '',
            status: 'pending',
            workerId: null,
            workerName: null,
            chatId: null,
            createdAt: serverTimestamp()
        });

        showToast('✅ Booking submitted! Workers will be notified.');
        return bookingRef.id;
    } catch (error) {
        console.error('Booking error:', error);
        showToast('❌ Failed to submit booking. Please try again.');
        return null;
    }
}

// ===== LISTEN FOR PENDING BOOKINGS (Need Work page) =====
export function listenForBookings(callback) {
    const q = query(
        collection(db, 'bookings'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const bookings = [];
        snapshot.forEach(docSnap => {
            bookings.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(bookings);
    }, (error) => {
        console.error('Bookings listener error:', error);
    });
}

// ===== LISTEN FOR MY BOOKINGS (User's own bookings) =====
export function listenForMyBookings(userId, callback) {
    const q = query(
        collection(db, 'bookings'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const bookings = [];
        snapshot.forEach(docSnap => {
            bookings.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(bookings);
    });
}

// ===== ACCEPT BOOKING (Worker accepts) =====
export async function acceptBooking(bookingId) {
    const user = requireAuth();
    if (!user) return;

    try {
        // Create chat room
        const chatRef = await addDoc(collection(db, 'chats'), {
            bookingId,
            participants: [],
            type: 'booking',
            createdAt: serverTimestamp()
        });

        // Get booking to find userId
        const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
        const booking = bookingSnap.data();

        // Update chat with participants
        await updateDoc(doc(db, 'chats', chatRef.id), {
            participants: [booking.userId, user.uid]
        });

        // Update booking
        await updateDoc(doc(db, 'bookings', bookingId), {
            status: 'accepted',
            workerId: user.uid,
            workerName: user.displayName || 'Worker',
            workerPhoto: user.photoURL || null,
            chatId: chatRef.id
        });

        showToast('✅ Job accepted! Chat is now open.');
        return chatRef.id;
    } catch (error) {
        console.error('Accept error:', error);
        showToast('❌ Failed to accept booking.');
        return null;
    }
}

// ===== DECLINE BOOKING =====
export async function declineBooking(bookingId) {
    // Just remove from view for this worker (no DB change needed for pending)
    showToast('Job declined');
}

// ===== RENDER BOOKINGS (for need-work page) =====
export function renderBookings(bookings, container) {
    if (!container) return;

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding: 3rem;">
                <div style="font-size: 48px; margin-bottom: 1rem;">📭</div>
                <h4>No pending jobs</h4>
                <p style="color: var(--text-muted);">New job requests will appear here in real-time.</p>
            </div>
        `;
        return;
    }

    const categoryIcons = {
        plumber: '🔧', electrician: '⚡', cleaner: '🧹',
        ac: '❄️', carpenter: '🪚', painter: '🎨',
        mechanic: '🔩', other: '📦'
    };

    container.innerHTML = bookings.map(b => `
        <div class="incoming-job card" data-booking-id="${b.id}">
            <div class="ij-header">
                <div class="ij-icon">${categoryIcons[b.category] || '📋'}</div>
                <div class="ij-info">
                    <div class="ij-title">${capitalize(b.category)} Service${b.description ? ' — ' + truncate(b.description, 40) : ''}</div>
                    <div class="ij-meta">💰 ₹${b.budget?.toLocaleString() || '—'} · 👤 ${b.userName || 'User'}</div>
                    <div class="ij-time">⏰ ${timeAgo(b.createdAt?.toDate?.() || new Date())}</div>
                </div>
            </div>
            <div class="ij-actions">
                <button class="btn btn-primary btn-sm accept-booking-btn" data-id="${b.id}">Accept</button>
                <button class="btn btn-secondary btn-sm decline-booking-btn" data-id="${b.id}">Decline</button>
            </div>
        </div>
    `).join('');

    // Bind accept/decline
    container.querySelectorAll('.accept-booking-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            btn.disabled = true;
            btn.textContent = 'Accepting...';
            const chatId = await acceptBooking(id);
            if (chatId) {
                window.dispatchEvent(new CustomEvent('openChat', { detail: { chatId } }));
            }
        });
    });

    container.querySelectorAll('.decline-booking-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.incoming-job').remove();
            declineBooking(btn.dataset.id);
        });
    });
}

// ===== HELPERS =====
function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hrs ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

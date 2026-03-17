// ===== BOOKING MODULE (Instant Services) — Express/MongoDB backend =====
import { apiCreateBooking, apiGetPendingBookings, apiUpdateBookingStatus } from './api.js';
import { requireAuth, showToast, getUser } from './auth.js';

// ===== CREATE BOOKING (Need Worker page) =====
export async function createBooking({ category, description, budget, date, time }) {
    const user = requireAuth();
    if (!user) return null;

    try {
        const data = await apiCreateBooking({
            category,
            description: description || '',
            budget: parseInt(budget) || 500,
            date: date || '',
            time: time || ''
        });

        showToast('✅ Booking submitted! Workers will be notified.');
        return data.booking?._id || true;
    } catch (error) {
        console.error('Booking error:', error);
        showToast('❌ Failed to submit booking. Please try again.');
        return null;
    }
}

// ===== FETCH PENDING BOOKINGS (Need Work page — polling) =====
let bookingPollTimer = null;

export function listenForBookings(callback) {
    async function poll() {
        try {
            const data = await apiGetPendingBookings();
            const bookings = (data.bookings || []).map(b => ({
                ...b,
                id: b._id,
                createdAt: b.createdAt ? { toDate: () => new Date(b.createdAt) } : null
            }));
            callback(bookings);
        } catch (e) {
            console.error('Bookings poll error:', e);
        }
    }

    poll();
    bookingPollTimer = setInterval(poll, 10000); // poll every 10s

    // Return unsubscribe function
    return () => {
        if (bookingPollTimer) clearInterval(bookingPollTimer);
    };
}

// ===== FETCH MY BOOKINGS =====
export function listenForMyBookings(userId, callback) {
    // For the profile page we just fetch once
    import('./api.js').then(async ({ apiGetMyBookings }) => {
        try {
            const data = await apiGetMyBookings();
            const bookings = (data.bookings || []).map(b => ({
                ...b,
                id: b._id,
                createdAt: b.createdAt ? { toDate: () => new Date(b.createdAt) } : null
            }));
            callback(bookings);
        } catch (e) {
            console.error('My bookings error:', e);
            callback([]);
        }
    });
}

// ===== ACCEPT BOOKING (Worker accepts) =====
export async function acceptBooking(bookingId) {
    const user = requireAuth();
    if (!user) return;

    try {
        await apiUpdateBookingStatus(bookingId, 'confirmed');
        showToast('✅ Job accepted!');
        return null; // No chat ID for now — chat handled via API
    } catch (error) {
        console.error('Accept error:', error);
        showToast('❌ Failed to accept booking.');
        return null;
    }
}

// ===== DECLINE BOOKING =====
export async function declineBooking(bookingId) {
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
                <p style="color: var(--text-muted);">New job requests will appear here.</p>
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
            await acceptBooking(id);
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

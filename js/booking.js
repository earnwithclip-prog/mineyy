// ===== BOOKING MODULE — Express/MongoDB backend =====
import { apiCreateBooking, apiGetPendingBookings, apiUpdateBookingStatus } from './api.js';
import { getUser, showToast } from './auth.js';
import { openChat } from './chat.js';

// ===== CREATE BOOKING =====
export async function createBooking(data) {
    try {
        const result = await apiCreateBooking(data);
        showToast('✅ Booking submitted! A worker will accept soon.');
        return result.booking?._id || result.bookingId || true;
    } catch (error) {
        showToast('❌ ' + (error.message || 'Booking failed'));
        return null;
    }
}

// ===== LISTEN FOR PENDING BOOKINGS (worker side — polling) =====
let bookingPollTimer = null;

export function listenForBookings(callback) {
    // Stop any existing timer
    if (bookingPollTimer) clearInterval(bookingPollTimer);

    async function fetchPending() {
        try {
            const data = await apiGetPendingBookings();
            callback(data.bookings || []);
        } catch (e) {
            console.error('Fetch pending bookings error:', e);
        }
    }

    fetchPending();
    bookingPollTimer = setInterval(fetchPending, 10000);
}

// ===== ACCEPT / DECLINE BOOKING =====
export async function acceptBooking(bookingId) {
    try {
        const result = await apiUpdateBookingStatus(bookingId, 'confirmed');
        showToast('✅ Job accepted! Chat opened with customer.');
        if (result.chatId) {
            openChat(result.chatId);
        }
        return true;
    } catch (error) {
        showToast('❌ ' + (error.message || 'Failed to accept'));
        return false;
    }
}

export async function declineBooking(bookingId) {
    try {
        await apiUpdateBookingStatus(bookingId, 'cancelled');
        showToast('Job declined');
        return true;
    } catch (error) {
        showToast('❌ ' + (error.message || 'Failed to decline'));
        return false;
    }
}

// ===== RENDER BOOKINGS (for worker dashboard) =====
export function renderBookings(bookings, container) {
    if (!container) return;

    const categoryIcons = {
        plumber: '🔧', electrician: '⚡', cleaner: '🧹',
        ac: '❄️', carpenter: '🪚', painter: '🎨',
        mechanic: '🔩', cook: '🍳', driver: '🚗', other: '📦'
    };

    container.innerHTML = bookings.map(b => `
        <div class="incoming-job" data-booking-id="${b._id}">
            <div class="job-header">
                <div class="job-icon">${categoryIcons[b.category] || '📦'}</div>
                <div class="job-title-row">
                    <div class="job-title">${capitalize(b.category)} Service</div>
                    <span class="job-badge urgent">New</span>
                </div>
            </div>
            <div class="job-details">
                <div class="job-detail"><span>👤</span> ${b.userName || 'Customer'}</div>
                <div class="job-detail"><span>💰</span> ₹${b.budget?.toLocaleString() || '—'}</div>
                ${b.date ? `<div class="job-detail"><span>📅</span> ${b.date} ${b.time || ''}</div>` : ''}
            </div>
            ${b.description ? `<div class="job-description">${b.description}</div>` : ''}
            <div class="job-actions">
                <button class="btn btn-primary accept-booking-btn" data-id="${b._id}">Accept ✓</button>
                <button class="btn btn-secondary decline-booking-btn" data-id="${b._id}">Decline</button>
            </div>
        </div>
    `).join('');

    // Wire accept/decline buttons
    container.querySelectorAll('.accept-booking-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = 'Accepting...';
            const success = await acceptBooking(btn.dataset.id);
            if (success) {
                const card = btn.closest('.incoming-job');
                if (card) {
                    card.style.transition = 'all 0.3s';
                    card.style.opacity = '0.5';
                    card.querySelector('.job-badge')?.classList.replace('urgent', '');
                }
            } else {
                btn.disabled = false;
                btn.textContent = 'Accept ✓';
            }
        });
    });

    container.querySelectorAll('.decline-booking-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            const success = await declineBooking(btn.dataset.id);
            if (success) {
                const card = btn.closest('.incoming-job');
                if (card) {
                    card.style.transition = 'all 0.3s';
                    card.style.opacity = '0';
                    card.style.transform = 'translateX(-20px)';
                    setTimeout(() => card.remove(), 300);
                }
            } else {
                btn.disabled = false;
            }
        });
    });
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

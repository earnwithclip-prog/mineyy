// ===== PAGES-BOOKING.JS — Need a Worker + Need Work Dashboard (Full End-to-End) =====
import {
    apiCreateBooking, apiGetMyBookings, apiGetPendingBookings,
    apiGetWorkerBookings, apiGetNearbyBookings, apiUpdateBookingStatus,
    apiCancelBooking, apiCompleteBooking, apiRateBooking, apiToggleAvailability
} from './api.js';
import { requireAuth, showToast, getUser } from './auth.js';
import { openChat, startLocationSharing, stopLocationSharing } from './chat.js';

const categoryIcons = {
    plumber: '🔧', electrician: '⚡', cleaner: '🧹',
    ac: '❄️', carpenter: '🪚', painter: '🎨', mechanic: '🔩',
    cook: '👨‍🍳', driver: '🚗', other: '📦'
};

function timeAgo(date) {
    if (!date) return '';
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ===== RATING STARS WIDGET =====
function buildRatingWidget(bookingId, onSubmit) {
    const div = document.createElement('div');
    div.className = 'rating-widget card';
    div.innerHTML = `
        <h4 style="color:#fff;margin:0 0 12px;">⭐ Rate the Worker</h4>
        <p style="color:#9ca3af;font-size:0.9rem;margin-bottom:12px;">How was the service?</p>
        <div class="stars-row" id="starsRow_${bookingId}">
            ${[1,2,3,4,5].map(n => `<button class="star-btn" data-val="${n}" style="font-size:28px;background:none;border:none;cursor:pointer;opacity:0.4;touch-action:manipulation;" title="${n} star${n>1?'s':''}">⭐</button>`).join('')}
        </div>
        <textarea id="feedbackInput_${bookingId}" class="form-input" rows="2" placeholder="Optional feedback..." style="margin-top:12px;"></textarea>
        <button id="submitRatingBtn_${bookingId}" class="btn btn-primary" style="width:100%;margin-top:12px;" disabled touch-action="manipulation">Submit Rating</button>`;

    let selectedRating = 0;
    const stars = div.querySelectorAll('.star-btn');
    const submitBtn = div.querySelector(`#submitRatingBtn_${bookingId}`);

    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.val);
            stars.forEach(s => {
                s.style.opacity = parseInt(s.dataset.val) <= selectedRating ? '1' : '0.3';
            });
            submitBtn.disabled = false;
        });
    });

    submitBtn.addEventListener('click', async () => {
        if (!selectedRating) return;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        const feedback = div.querySelector(`#feedbackInput_${bookingId}`)?.value?.trim() || '';
        await onSubmit(selectedRating, feedback);
    });

    return div;
}

// ===== NEED A WORKER: Booking page =====
export async function initBookingPage() {
    // On auth, load active booking status
    window.addEventListener('authStateChanged', (e) => {
        if (e.detail?.user) loadActiveBookingStatus();
    });
    const user = getUser();
    if (user) loadActiveBookingStatus();
}

async function loadActiveBookingStatus() {
    try {
        const data = await apiGetMyBookings();
        const bookings = data.bookings || [];
        // Find the most recent non-cancelled, non-completed booking
        const active = bookings.find(b => ['pending', 'confirmed', 'in-progress'].includes(b.status));
        if (!active) return;

        const container = document.querySelector('.booking-section .container');
        if (!container) return;

        const existingStatus = document.getElementById('activeBookingStatus');
        if (existingStatus) existingStatus.remove();

        const statusDiv = document.createElement('div');
        statusDiv.id = 'activeBookingStatus';
        statusDiv.style.cssText = 'margin-bottom:24px;';

        const statusLabels = { pending: '⏳ Looking for workers...', confirmed: '✅ Worker assigned!', 'in-progress': '🔨 Work in progress' };
        const iconMap = { pending: '⏳', confirmed: '✅', 'in-progress': '🔨' };

        const workerContact = active.status === 'confirmed' && active.workerId
            ? `<div class="contact-reveal-card" style="margin-top:12px;">
                <div class="contact-reveal-title">📞 Worker Contact (Revealed after acceptance)</div>
                <div class="contact-reveal-item">📱 ${active.workerPhone || active.workerId?.phone || 'See chat'}</div>
               </div>` : '';

        statusDiv.innerHTML = `
            <div class="card" style="border:2px solid rgba(124,58,237,0.4);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div>
                        <h3 style="color:#fff;margin:0;">${iconMap[active.status]} Active Booking</h3>
                        <p style="color:#a78bfa;margin:4px 0 0;">${capitalize(active.category)} Service · ${statusLabels[active.status]}</p>
                    </div>
                    <span style="background:rgba(124,58,237,0.2);color:#a78bfa;padding:6px 14px;border-radius:20px;font-size:0.85rem;font-weight:700;">${capitalize(active.status)}</span>
                </div>
                ${active.workerName ? `<p style="color:#9ca3af;margin:10px 0 0;">👷 Assigned to: <strong style="color:#fff;">${active.workerName}</strong></p>` : ''}
                <p style="color:#9ca3af;font-size:0.85rem;margin:4px 0 0;">💰 Budget: ₹${active.budget?.toLocaleString()} · ${timeAgo(active.createdAt)}</p>
                ${workerContact}
                <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
                    ${active.status === 'confirmed' && active.chatId ? `<button class="btn btn-primary btn-sm" onclick="document.getElementById('chatToggle')?.click()">💬 Open Chat</button>` : ''}
                    ${active.workerName ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${active.userCoordinates?.lat},${active.userCoordinates?.lng}" target="_blank" class="btn btn-secondary btn-sm">🗺️ Navigate</a>` : ''}
                    ${active.status === 'confirmed' ? `<button class="btn btn-primary btn-sm complete-booking-btn" data-id="${active._id}" style="background:linear-gradient(135deg,#10b981,#059669);touch-action:manipulation">✅ Mark Complete</button>` : ''}
                    <button class="btn btn-secondary btn-sm cancel-booking-btn" data-id="${active._id}" style="touch-action:manipulation">❌ Cancel</button>
                </div>
            </div>`;

        container.insertBefore(statusDiv, container.firstChild);

        // Wire complete button
        statusDiv.querySelector('.complete-booking-btn')?.addEventListener('click', async (e) => {
            const btn = e.target;
            if (!confirm('Mark this work as complete?')) return;
            btn.disabled = true; btn.textContent = 'Completing...';
            try {
                await apiCompleteBooking(active._id);
                showToast('✅ Great! Work marked as complete.');
                // Show rating widget
                statusDiv.querySelector('.card').appendChild(
                    buildRatingWidget(active._id, async (rating, feedback) => {
                        try {
                            await apiRateBooking(active._id, rating, feedback);
                            showToast('⭐ Thank you for your rating!');
                            statusDiv.remove();
                        } catch(err) { showToast('❌ ' + err.message); }
                    })
                );
                btn.remove();
            } catch(err) {
                showToast('❌ ' + err.message);
                btn.disabled = false; btn.textContent = '✅ Mark Complete';
            }
        });

        // Wire cancel button
        statusDiv.querySelector('.cancel-booking-btn')?.addEventListener('click', async (e) => {
            const btn = e.target;
            if (!confirm('Cancel this booking?')) return;
            btn.disabled = true; btn.textContent = 'Cancelling...';
            try {
                await apiCancelBooking(active._id, 'User cancelled');
                showToast('Booking cancelled.');
                statusDiv.remove();
            } catch(err) {
                showToast('❌ ' + err.message);
                btn.disabled = false; btn.textContent = '❌ Cancel';
            }
        });

    } catch (err) {
        // Server not running — silently ignore
        console.warn('Could not load active booking:', err.message);
    }
}

// Called from need-worker.html inline script
export async function createBooking({ category, description, budget, scheduleType, date, time, userCoordinates, userLocation }) {
    const user = requireAuth();
    if (!user) return null;

    try {
        const data = await apiCreateBooking({
            category,
            description,
            budget: parseInt(budget),
            scheduleType: scheduleType || 'immediate',
            date,
            time,
            userCoordinates: userCoordinates || { lat: 0, lng: 0 },
            userLocation: userLocation || ''
        });
        showToast('✅ Request sent! Nearby workers will be notified.');
        return data.booking?._id;
    } catch (err) {
        showToast('❌ ' + err.message);
        return null;
    }
}

// ===== NEED WORK DASHBOARD =====
export async function initWorkerDashboard() {
    const incomingContainer = document.querySelector('.incoming-jobs');
    const workerToggle = document.getElementById('workerToggle');
    const earningsAmount = document.querySelector('.earnings-amount');
    const totalJobsEl = document.querySelector('.ec-stat-value');
    const ratingEl = document.querySelectorAll('.ec-stat-value')[1];

    let workerLat = 0, workerLng = 0;

    function startDashboard() {
        // Load real stats
        loadWorkerStats(earningsAmount, totalJobsEl, ratingEl);

        // Get GPS then load incoming jobs
        navigator.geolocation?.getCurrentPosition(
            (pos) => {
                workerLat = pos.coords.latitude;
                workerLng = pos.coords.longitude;
                loadIncomingJobs(incomingContainer, workerLat, workerLng);
            },
            () => loadIncomingJobs(incomingContainer, 0, 0),
            { enableHighAccuracy: false, timeout: 8000 }
        );

        // Load job history
        loadJobHistory();
    }

    // Check auth state
    const user = getUser();
    if (user) {
        startDashboard();
    } else {
        // Show sign-in prompt
        if (incomingContainer) {
            incomingContainer.innerHTML = `
                <div class="card" style="text-align:center;padding:var(--space-2xl)">
                    <div style="font-size:48px;margin-bottom:16px">🔐</div>
                    <h4 style="color:#fff;margin-bottom:8px;">Sign in to start working</h4>
                    <p style="color:#9ca3af;margin-bottom:16px;">Sign in to see nearby job requests and toggle your availability.</p>
                    <button class="btn btn-primary" onclick="document.getElementById('userAuthBtn')?.click()">Sign In / Register</button>
                </div>`;
        }
        // Listen for login
        window.addEventListener('authStateChanged', (e) => {
            if (e.detail?.user) startDashboard();
        }, { once: true });
    }

    // Toggle online/offline
    if (workerToggle) {
        const statusText = workerToggle.closest('.toggle-container')?.querySelector('.toggle-status');
        const statusIndicator = document.querySelector('.status-indicator');

        workerToggle.addEventListener('click', async () => {
            const user = requireAuth();
            if (!user) return;

            const goingOnline = !workerToggle.classList.contains('active');
            workerToggle.disabled = true;

            try {
                const coords = workerLat !== 0 ? { lat: workerLat, lng: workerLng } : null;
                await apiToggleAvailability(goingOnline, coords);

                workerToggle.classList.toggle('active', goingOnline);
                if (statusText) statusText.textContent = goingOnline ? "You're Online" : "You're Offline";
                if (statusIndicator) {
                    statusIndicator.className = `status-indicator ${goingOnline ? 'online' : 'offline'}`;
                    statusIndicator.innerHTML = `<span class="pulse-dot"></span> ${goingOnline ? 'Active' : 'Offline'}`;
                }

                if (goingOnline) {
                    startLocationSharing();
                    showToast('🟢 You are now online! Customers can find you.');
                    loadIncomingJobs(incomingContainer, workerLat, workerLng);
                } else {
                    stopLocationSharing();
                    showToast('🔴 You are offline. No new requests will be received.');
                }
            } catch (err) {
                showToast('❌ ' + err.message);
            } finally {
                workerToggle.disabled = false;
            }
        });
    }

    // Refresh incoming jobs every 30s
    setInterval(() => {
        if (document.visibilityState === 'visible' && workerToggle?.classList.contains('active')) {
            loadIncomingJobs(incomingContainer, workerLat, workerLng);
        }
    }, 30000);
}

async function loadWorkerStats(earningsEl, totalJobsEl, ratingEl) {
    try {
        const data = await apiGetWorkerBookings();
        const bookings = data.bookings || [];

        const completed = bookings.filter(b => b.status === 'completed');
        const totalEarnings = completed.reduce((s, b) => s + (b.budget || 0), 0);
        const myBookings = completed.filter(b => b.workerId?.toString?.() || b.workerId);
        const ratings = bookings.filter(b => b.rating).map(b => b.rating);
        const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';

        if (earningsEl) earningsEl.textContent = '₹' + totalEarnings.toLocaleString();
        if (totalJobsEl) totalJobsEl.textContent = completed.length;
        if (ratingEl) ratingEl.textContent = '⭐ ' + avgRating;
    } catch (e) {
        // Keep static values
    }
}

async function loadIncomingJobs(container, lat, lng) {
    if (!container) return;

    try {
        let data;
        if (lat !== 0 && lng !== 0) {
            data = await apiGetNearbyBookings(lat, lng, 15);
        } else {
            data = await apiGetPendingBookings();
        }
        const bookings = data.bookings || [];

        if (bookings.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align:center;padding:var(--space-2xl)">
                    <div style="font-size:48px;margin-bottom:16px">✅</div>
                    <p style="color:var(--text-muted)">No pending requests right now. Stay online to receive requests!</p>
                </div>`;
            return;
        }

        container.innerHTML = bookings.map(b => {
            const distStr = b.distance != null ? `📍 ${b.distance.toFixed(1)} km away` : '📍 Nearby';
            const mapBtn = b.userCoordinates?.lat
                ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${b.userCoordinates.lat},${b.userCoordinates.lng}" target="_blank" class="btn btn-secondary btn-sm" style="touch-action:manipulation;">🗺️ Navigate</a>`
                : '';
            return `
            <div class="incoming-job card reveal">
                <div class="ij-header">
                    <div class="ij-icon">${categoryIcons[b.category] || '📋'}</div>
                    <div class="ij-info">
                        <div class="ij-title">${capitalize(b.category)} — ${b.description || 'Service Request'}</div>
                        <div class="ij-meta">${distStr} · 💰 ₹${b.budget?.toLocaleString() || '—'}</div>
                        <div class="ij-meta">👤 ${b.userName || 'Customer'} · ${b.scheduleType === 'immediate' ? '⚡ Immediate' : '📅 Scheduled'}</div>
                        <div class="ij-time">⏰ ${timeAgo(b.createdAt)}</div>
                    </div>
                </div>
                <div class="ij-actions">
                    <button class="btn btn-primary btn-sm accept-booking-btn" data-id="${b._id}" style="touch-action:manipulation">✅ Accept</button>
                    <button class="btn btn-secondary btn-sm decline-booking-btn" data-id="${b._id}" style="touch-action:manipulation">❌ Decline</button>
                    ${mapBtn}
                </div>
            </div>`;
        }).join('');

        // Wire accept buttons
        container.querySelectorAll('.accept-booking-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const user = requireAuth();
                if (!user) return;
                btn.disabled = true; btn.textContent = 'Accepting...';
                try {
                    const result = await apiUpdateBookingStatus(btn.dataset.id, 'confirmed');
                    showToast('✅ Accepted! Customer notified. Contact revealed in chat.');

                    // Show contact info
                    if (result.contactInfo?.userPhone) {
                        const card = btn.closest('.incoming-job');
                        const contactDiv = document.createElement('div');
                        contactDiv.className = 'contact-reveal-card';
                        contactDiv.style.cssText = 'background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:10px;margin-top:10px;';
                        contactDiv.innerHTML = `<div style="font-weight:700;color:#10b981;font-size:0.88rem;margin-bottom:4px;">📞 Customer Contact</div>
                            <div style="color:#d1fae5;font-size:0.9rem;">📱 ${result.contactInfo.userPhone || 'Not provided'}</div>
                            <div style="color:#d1fae5;font-size:0.9rem;">✉️ ${result.contactInfo.userEmail || ''}</div>`;
                        card?.querySelector('.ij-info')?.appendChild(contactDiv);
                    }

                    if (result.chatId) {
                        openChat(result.chatId);
                        startLocationSharing();
                    }

                    // Reload after delay
                    setTimeout(() => loadIncomingJobs(container, lat, lng), 3000);
                } catch (err) {
                    showToast('❌ ' + err.message);
                    btn.disabled = false; btn.textContent = '✅ Accept';
                }
            });
        });

        // Wire decline buttons
        container.querySelectorAll('.decline-booking-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                btn.disabled = true; btn.textContent = 'Declining...';
                try {
                    await apiCancelBooking(btn.dataset.id, 'Worker declined');
                    showToast('Request declined.');
                    await loadIncomingJobs(container, lat, lng);
                } catch (err) {
                    showToast('❌ ' + err.message);
                    btn.disabled = false; btn.textContent = '❌ Decline';
                }
            });
        });

        setTimeout(() => container.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')), 50);

    } catch (err) {
        console.warn('Could not load pending bookings:', err.message);
        if (container) {
            container.innerHTML = `
                <div class="card" style="text-align:center;padding:var(--space-2xl)">
                    <div style="font-size:48px;margin-bottom:16px">⚠️</div>
                    <p style="color:#9ca3af;">Could not load job requests. Is the server running?<br><small style="font-size:0.8em">${err.message}</small></p>
                </div>`;
        }
    }
}

async function loadJobHistory() {
    const historyList = document.querySelector('.history-list');
    if (!historyList) return;
    try {
        const data = await apiGetWorkerBookings();
        const bookings = (data.bookings || []).filter(b => b.status === 'completed').slice(0, 10);
        if (bookings.length === 0) return;
        historyList.innerHTML = bookings.map(b => `
            <div class="history-item">
                <div class="hi-icon">✅</div>
                <div class="hi-info">
                    <div class="hi-title">${capitalize(b.category)}</div>
                    <div class="hi-meta">💰 ₹${b.budget?.toLocaleString()} · ${timeAgo(b.createdAt)}</div>
                    ${b.rating ? `<div class="hi-meta">⭐ ${b.rating}/5 ${b.feedback ? `— "${b.feedback}"` : ''}</div>` : ''}
                </div>
            </div>`).join('');
    } catch (e) { /* keep static */ }
}

// ===== PAGE-SPECIFIC: BOOKING (Need Worker & Need Work) =====
import { createBooking, listenForBookings, renderBookings } from './booking.js';
import { requireAuth, getUser, showToast } from './auth.js';
import { apiGetWorkers, apiUpdateWorkerProfile, apiRegisterAsWorker } from './api.js';

// ===== NEED WORKER PAGE (User books a worker) =====
export function initBookingPage() {
    const form = document.querySelector('.booking-form');
    if (!form) return;

    // The advanced 5-step booking flow on need-worker.html has its own
    // inline script that handles submission with createBooking + auth.
    // If we detect that wizard, skip attaching a second handler here
    // to avoid double-booking.
    if (form.querySelector('.booking-step')) {
        // Load real workers into the sidebar instead of static HTML
        loadSidebarWorkers();
        return;
    }

    const submitBtn = form.querySelector('.booking-submit-btn') || form.querySelector('.btn-primary');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const user = requireAuth();
        if (!user) return;

        // Gather form data
        const category = form.querySelector('.category-card.active')?.dataset?.category ||
            form.querySelector('select')?.value || 'other';
        const description = form.querySelector('textarea')?.value || '';
        const budget = form.querySelector('input[type="number"]')?.value ||
            form.querySelector('input[placeholder*="budget" i]')?.value || '500';
        const date = form.querySelector('input[type="date"]')?.value || '';
        const time = form.querySelector('input[type="time"]')?.value || '';

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const bookingId = await createBooking({ category, description, budget, date, time });

        if (bookingId) {
            submitBtn.textContent = 'Booked ✓';
            // Reset form after 2s
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm Booking →';
            }, 3000);
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Booking →';
        }
    });

    // Add data-category to category cards
    document.querySelectorAll('.category-card').forEach(card => {
        const label = card.querySelector('.category-name')?.textContent?.toLowerCase() || '';
        card.dataset.category = label.includes('plumb') ? 'plumber' :
            label.includes('electr') ? 'electrician' :
                label.includes('clean') ? 'cleaner' :
                    label.includes('ac') ? 'ac' :
                        label.includes('carpen') ? 'carpenter' :
                            label.includes('paint') ? 'painter' : 'other';
    });
}

// ===== LOAD REAL WORKERS INTO SIDEBAR =====
let selectedWorkerId = null;

async function loadSidebarWorkers(category) {
    const sidebar = document.querySelector('.sidebar-workers');
    if (!sidebar) return;

    // Keep static fallback
    const staticFallback = sidebar.innerHTML;

    try {
        const params = { available: 'true' };
        if (category && category !== 'all') params.category = category;

        const data = await apiGetWorkers(params);
        const workers = data.workers || [];

        if (workers.length === 0) {
            // Keep the static demo cards if DB is empty
            return;
        }

        const colors = ['#7C3AED', '#4F46E5', '#6366F1', '#8B5CF6', '#A855F7'];

        sidebar.innerHTML = workers.map((w, i) => `
            <div class="worker-card" data-worker-id="${w._id}" style="cursor:pointer;">
                <div class="worker-avatar" style="background: ${colors[i % colors.length]};">${(w.name || 'W')[0].toUpperCase()}</div>
                <div class="worker-info">
                    <div class="worker-name">${w.name}</div>
                    <div class="worker-skill">${(w.skills || []).join(', ') || 'General'} · ${w.totalJobs || 0} jobs</div>
                    <div class="worker-rating">⭐ ${w.rating?.toFixed(1) || '4.5'} · ₹${w.pricePerHour || 300}/hr</div>
                </div>
                <div class="worker-status ${w.isAvailable ? '' : 'offline'}"></div>
            </div>
        `).join('');

        // Click to select a worker for booking
        sidebar.querySelectorAll('.worker-card').forEach(card => {
            card.addEventListener('click', () => {
                sidebar.querySelectorAll('.worker-card').forEach(c => c.style.outline = '');
                card.style.outline = '2px solid #7C3AED';
                selectedWorkerId = card.dataset.workerId;
                showToast('✅ Worker selected! Complete the form to book them.');
            });
        });
    } catch (e) {
        console.error('Load workers error:', e);
        // Keep static fallback on error
    }

    // Reload workers when category changes
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const cat = card.dataset.category;
            if (cat) loadSidebarWorkers(cat);
        });
    });
}

// Export for the inline script to use
window.__getSelectedWorkerId = () => selectedWorkerId;

// ===== NEED WORK PAGE (Worker dashboard — sees incoming jobs) =====
export function initWorkerDashboard() {
    const container = document.querySelector('.incoming-jobs');
    if (!container) return;

    // Save static fallback content for when user is not signed in
    const staticFallback = container.innerHTML;

    // ===== WIRE AVAILABILITY TOGGLE =====
    const toggle = document.getElementById('workerToggle');
    const statusText = toggle?.closest('.toggle-container')?.querySelector('.toggle-status');
    const statusIndicator = document.querySelector('.status-indicator');

    if (toggle) {
        toggle.addEventListener('click', async () => {
            const user = requireAuth();
            if (!user) return;

            const isOnline = toggle.classList.contains('active');

            try {
                // First register as worker if not already
                if (user.role !== 'worker') {
                    await apiRegisterAsWorker({
                        skills: ['plumber', 'electrician'],
                        isAvailable: !isOnline,
                        pricePerHour: 300
                    });
                    showToast('✅ Registered as worker! You can now receive jobs.');
                } else {
                    await apiUpdateWorkerProfile({ isAvailable: !isOnline });
                }

                // UI updates are handled by main.js toggle handler
                if (statusIndicator) {
                    if (isOnline) {
                        statusIndicator.classList.remove('online');
                        statusIndicator.classList.add('offline');
                        statusIndicator.innerHTML = '<span class="pulse-dot"></span> Offline';
                    } else {
                        statusIndicator.classList.remove('offline');
                        statusIndicator.classList.add('online');
                        statusIndicator.innerHTML = '<span class="pulse-dot"></span> Active';
                    }
                }
            } catch (e) {
                console.error('Toggle availability error:', e);
                showToast('❌ Failed to update availability.');
            }
        });
    }

    // ===== WIRE ACCEPT/DECLINE ON STATIC CARDS =====
    function wireStaticButtons() {
        container.querySelectorAll('.incoming-job').forEach(card => {
            const acceptBtn = card.querySelector('.btn-primary');
            const declineBtn = card.querySelector('.btn-secondary');

            if (acceptBtn && !acceptBtn.dataset.wired) {
                acceptBtn.dataset.wired = 'true';
                acceptBtn.addEventListener('click', async () => {
                    const user = requireAuth();
                    if (!user) return;
                    acceptBtn.disabled = true;
                    acceptBtn.textContent = 'Accepted ✓';
                    acceptBtn.style.opacity = '0.6';
                    card.style.opacity = '0.5';
                    showToast('✅ Job accepted!');
                });
            }

            if (declineBtn && !declineBtn.dataset.wired) {
                declineBtn.dataset.wired = 'true';
                declineBtn.addEventListener('click', () => {
                    card.style.transition = 'all 0.3s';
                    card.style.opacity = '0';
                    card.style.transform = 'translateX(-20px)';
                    setTimeout(() => card.remove(), 300);
                    showToast('Job declined');
                });
            }
        });
    }

    wireStaticButtons();

    // ===== FETCH REAL INCOMING BOOKINGS =====
    function startListening() {
        listenForBookings((bookings) => {
            if (bookings.length > 0) {
                renderBookings(bookings, container);
            }
            // If no real bookings, keep the static demo cards as they are
        });
    }

    // Wait for auth then start listening
    window.addEventListener('authStateChanged', (e) => {
        const user = e.detail?.user;
        if (user) {
            startListening();
        } else {
            // If signed out, restore static content
            container.innerHTML = staticFallback;
            wireStaticButtons();
        }
    });

    // If already signed in
    const user = getUser();
    if (user) {
        startListening();
    }

    // ===== WIRE EARNINGS & STATS (load from user profile) =====
    function updateDashboardStats(user) {
        const earningsEl = document.querySelector('.earnings-amount');
        const jobsEl = document.querySelector('.ec-stat-value');
        const ratingEl = document.querySelectorAll('.ec-stat-value')[1];
        const totalJobsEl = document.querySelector('.qs-item .qs-value');

        if (user && user.totalJobs !== undefined) {
            if (jobsEl) jobsEl.textContent = user.totalJobs || '0';
            if (ratingEl) ratingEl.textContent = '⭐ ' + (user.rating?.toFixed(1) || '4.5');
        }
    }

    window.addEventListener('authStateChanged', (e) => {
        if (e.detail?.user) updateDashboardStats(e.detail.user);
    });
    if (getUser()) updateDashboardStats(getUser());
}

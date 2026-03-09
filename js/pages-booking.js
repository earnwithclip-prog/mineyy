// ===== PAGE-SPECIFIC: BOOKING (Need Worker & Need Work) =====
import { createBooking, listenForBookings, renderBookings } from './booking.js';
import { requireAuth, getUser } from './auth.js';

// ===== NEED WORKER PAGE (User books a worker) =====
export function initBookingPage() {
    const form = document.querySelector('.booking-form');
    if (!form) return;

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

// ===== NEED WORK PAGE (Worker dashboard — sees incoming jobs) =====
export function initWorkerDashboard() {
    const container = document.querySelector('.incoming-jobs');
    if (!container) return;

    // Save static fallback content for when user is not signed in
    const staticFallback = container.innerHTML;

    function startListening() {
        listenForBookings((bookings) => {
            if (bookings.length > 0) {
                renderBookings(bookings, container);
            } else {
                container.innerHTML = staticFallback;
            }
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
        }
    });

    // If already signed in
    const user = getUser();
    if (user) {
        startListening();
    }
}

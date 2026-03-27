// ===== MAIN APPLICATION JS =====
import { initI18n } from './i18n.js';
import { initAnimations } from './animations.js';
import { initAuth, requireAuth } from './auth.js';
import { initChat } from './chat.js';
import { initNotifications } from './notifications.js';
import { initBookingPage, initWorkerDashboard } from './pages-booking.js';
import { initHiringPage, initFindJobPage } from './pages-jobs.js';

// ===== NAVBAR SCROLL =====
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    });

    // Mobile menu toggle
    const toggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-open');
            toggle.classList.toggle('active');
        });

        // Close on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('mobile-open');
                toggle.classList.remove('active');
            });
        });
    }
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => observer.observe(el));
}

// ===== SMOOTH SCROLL =====
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const id = this.getAttribute('href');
            if (id === '#') return;

            const target = document.querySelector(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ===== HOVER EFFECTS =====
function initHoverEffects() {
    // Gradient button shimmer
    document.querySelectorAll('.btn-primary').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.backgroundSize = '200% 200%';
            btn.style.animation = 'gradientShift 2s ease infinite';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.animation = 'none';
            btn.style.backgroundSize = '100% 100%';
        });
    });
}



// ===== CATEGORY CARDS (for app pages) =====
function initCategoryCards() {
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
}

// ===== TOGGLE SWITCH =====
// Note: #workerToggle is handled by pages-booking.js (full API + auth)
// This generic handler only runs for other toggle elements
function initToggles() {
    document.querySelectorAll('.toggle').forEach(toggle => {
        // Skip #workerToggle — it's managed by initWorkerDashboard()
        if (toggle.id === 'workerToggle') return;

        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            const isOnline = toggle.classList.contains('active');

            const statusText = toggle.closest('.toggle-container')?.querySelector('.toggle-status');
            if (statusText) {
                statusText.textContent = isOnline ? "You're Online" : "You're Offline";
            }

            const indicator = document.getElementById('workerStatusIndicator');
            if (indicator) {
                indicator.className = 'status-indicator ' + (isOnline ? 'online' : 'offline');
                indicator.innerHTML = '<span class="pulse-dot"></span> ' + (isOnline ? 'Online' : 'Offline');
            }
        });
    });
}

// ===== TAB SWITCHING =====
function initTabs() {
    document.querySelectorAll('[data-tab-btn]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabGroup = btn.closest('[data-tab-group]');
            if (!tabGroup) return;

            tabGroup.querySelectorAll('[data-tab-btn]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetTab = btn.dataset.tabBtn;
            tabGroup.querySelectorAll('[data-tab-content]').forEach(content => {
                content.classList.toggle('active', content.dataset.tabContent === targetTab);
            });
        });
    });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n first so saved language is applied immediately
    initI18n();

    initNavbar();
    initScrollReveal();
    initSmoothScroll();
    initHoverEffects();
    initCategoryCards();
    initToggles();
    initTabs();
    initAnimations();

    // Backend modules
    initAuth();
    initChat();
    initNotifications();

    // ===== GLOBAL CTA HANDLERS =====
    // "Join Now" button on homepage should trigger auth flow instead of just jumping to "#"
    const joinNowBtn = document.querySelector('[data-i18n="cta_join"]');
    if (joinNowBtn) {
        joinNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            requireAuth();
        });
    }

    // Page-specific initialization
    const path = window.location.pathname;
    if (path.includes('need-worker')) {
        initBookingPage();
    } else if (path.includes('need-work')) {
        initWorkerDashboard();
    } else if (path.includes('hire-monthly')) {
        initHiringPage();
    } else if (path.includes('find-job')) {
        initFindJobPage();
    }

    // Note: touch-action:manipulation is already set on buttons/cards via CSS
    // which removes the 300ms tap delay without needing a JS workaround.
});

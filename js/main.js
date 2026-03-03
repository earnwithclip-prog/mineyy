// ===== MAIN APPLICATION JS =====
import { initI18n } from './i18n.js';
import { initAnimations } from './animations.js';

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

// ===== COUNTER ANIMATION =====
function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.count);
                const suffix = entry.target.dataset.suffix || '';
                let current = 0;
                const step = Math.ceil(target / 60);
                const timer = setInterval(() => {
                    current += step;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    entry.target.textContent = current.toLocaleString() + suffix;
                }, 20);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
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
function initToggles() {
    document.querySelectorAll('.toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            const statusText = toggle.closest('.toggle-container')?.querySelector('.toggle-status');
            if (statusText) {
                statusText.dataset.i18n = toggle.classList.contains('active') ? 'nwork_online' : 'nwork_offline';
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
    initNavbar();
    initScrollReveal();
    initSmoothScroll();
    initHoverEffects();
    animateCounters();
    initCategoryCards();
    initToggles();
    initTabs();
    initI18n();
    initAnimations();
});

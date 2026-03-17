// ===== AUTH UI MODULE — Premium Glassmorphism Login =====
import { getToken, clearToken, getSavedUser, setSavedUser, setToken } from './api.js';

// Dynamic API base: use localhost in dev, deployed backend in production
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://mineyy-server.onrender.com/api';
const GOOGLE_CLIENT_ID = '966175682043-i94u9nsplkj52cgik88m2r77hmg61sik.apps.googleusercontent.com';

let currentUser = null;
let authStylesInjected = false;
let gisLoaded = false;

// ===== CLIENT-SIDE VALIDATION =====
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function validatePasswordClient(password) {
    const errors = [];
    if (password.length < 4) errors.push('at least 4 characters');
    return errors;
}

// ===== LOAD GOOGLE IDENTITY SERVICES =====
function loadGIS() {
    if (gisLoaded || document.getElementById('gis-script')) return;
    gisLoaded = true;
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredential,
            auto_select: false,
            cancel_on_tap_outside: true
        });
    };
    document.head.appendChild(script);
}

// ===== GOOGLE CREDENTIAL CALLBACK =====
async function handleGoogleCredential(response) {
    try {
        const res = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Google sign-in failed');

        setToken(data.token);
        setSavedUser(data.user);
        currentUser = data.user;
        updateAuthUI(data.user);
        showToast('✅ Signed in as ' + data.user.name);

        // Close modal if open
        document.getElementById('authOverlay')?.remove();
    } catch (error) {
        console.error('Google sign-in error:', error);
        showToast('❌ ' + error.message);
    }
}

// ===== INJECT AUTH STYLES =====
function injectAuthStyles() {
    if (authStylesInjected) return;
    authStylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        .auth-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: authFadeIn 0.25s ease;
        }
        .auth-overlay-bg {
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, #e9d5ff 0%, #dbeafe 50%, #c7d2fe 100%);
            opacity: 0.85;
        }
        .auth-overlay-blur {
            position: absolute;
            inset: 0;
            backdrop-filter: blur(40px);
            -webkit-backdrop-filter: blur(40px);
        }
        .auth-card {
            position: relative;
            z-index: 1;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            background: rgba(255,255,255,0.72);
            border: 1px solid rgba(255,255,255,0.35);
            box-shadow: 0 8px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.2) inset;
            border-radius: 20px;
            padding: 40px 32px;
            width: 100%;
            max-width: 400px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            animation: authSlideUp 0.35s ease;
        }
        .auth-card-logo {
            height: 40px;
            object-fit: contain;
        }
        .auth-card h1 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            text-align: center;
            margin: 0;
            letter-spacing: -0.3px;
        }
        .auth-card-form {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }
        .auth-card-input {
            width: 100%;
            padding: 13px 16px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            background: rgba(255,255,255,0.6);
            color: #1f2937;
            font-size: 15px;
            outline: none;
            transition: border 0.2s, box-shadow 0.2s;
            box-sizing: border-box;
            font-family: inherit;
        }
        .auth-card-input::placeholder {
            color: #9ca3af;
        }
        .auth-card-input:focus {
            border-color: #7c3aed;
            box-shadow: 0 0 0 3px rgba(124,58,237,0.12);
        }
        .auth-btn-primary {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 10px;
            background: #7c3aed;
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
            font-family: inherit;
        }
        .auth-btn-primary:hover {
            background: #6d28d9;
        }
        .auth-btn-primary:active {
            transform: scale(0.98);
        }
        .auth-btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .auth-btn-google {
            width: 100%;
            padding: 13px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            background: rgba(255,255,255,0.7);
            color: #374151;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: background 0.2s, border 0.2s;
            font-family: inherit;
        }
        .auth-btn-google:hover {
            background: rgba(255,255,255,0.9);
            border-color: #9ca3af;
        }
        .auth-btn-google svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
        .auth-card-divider {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
            color: #9ca3af;
            font-size: 13px;
        }
        .auth-card-divider::before,
        .auth-card-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #d1d5db;
        }
        .auth-card-footer {
            font-size: 14px;
            color: #4b5563;
            display: flex;
            gap: 4px;
        }
        .auth-card-footer a {
            color: #7c3aed;
            font-weight: 600;
            text-decoration: none;
        }
        .auth-card-footer a:hover {
            text-decoration: underline;
        }
        .auth-card-error {
            color: #ef4444;
            text-align: center;
            font-size: 13px;
            margin: 0;
            padding: 8px 12px;
            background: rgba(239,68,68,0.08);
            border-radius: 8px;
            display: none;
        }
        .auth-card-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 32px;
            height: 32px;
            border: none;
            background: rgba(0,0,0,0.06);
            border-radius: 50%;
            color: #6b7280;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .auth-card-close:hover {
            background: rgba(0,0,0,0.1);
        }
        @keyframes authFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes authSlideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 480px) {
            .auth-card {
                margin: 16px;
                padding: 32px 24px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Google SVG icon
const GOOGLE_SVG = `<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

// ===== UPDATE NAVBAR AUTH UI =====
function updateAuthUI(user) {
    currentUser = user;

    document.querySelectorAll('.auth-login-btn').forEach(btn => {
        btn.style.display = user ? 'none' : 'inline-flex';
    });

    document.querySelectorAll('.auth-profile').forEach(el => {
        if (user) {
            el.style.display = 'flex';
            const avatar = el.querySelector('.auth-avatar');
            const name = el.querySelector('.auth-name');
            if (avatar) {
                if (user.photoURL) {
                    avatar.style.backgroundImage = `url(${user.photoURL})`;
                    avatar.style.backgroundSize = 'cover';
                    avatar.textContent = '';
                } else {
                    avatar.textContent = (user.name || 'U')[0].toUpperCase();
                    avatar.style.backgroundImage = '';
                }
            }
            if (name) name.textContent = user.name || 'User';
        } else {
            el.style.display = 'none';
        }
    });

    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
}

// ===== CREATE NAVBAR AUTH ELEMENTS =====
function createAuthElements() {
    document.querySelectorAll('.nav-right').forEach(navRight => {
        if (navRight.querySelector('.auth-login-btn')) return;

        const loginBtn = document.createElement('button');
        loginBtn.className = 'btn btn-primary btn-sm auth-login-btn';
        loginBtn.innerHTML = '👤 Sign In';
        loginBtn.addEventListener('click', () => showLoginModal());

        const profileEl = document.createElement('div');
        profileEl.className = 'auth-profile';
        profileEl.style.display = 'none';
        profileEl.innerHTML = `
            <a href="/pages/profile.html" class="auth-avatar-link" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:inherit;">
                <div class="auth-avatar"></div>
                <span class="auth-name"></span>
            </a>
            <button class="auth-logout-btn" title="Sign Out">✕</button>
        `;
        profileEl.querySelector('.auth-logout-btn').addEventListener('click', handleLogout);

        const getStartedBtn = navRight.querySelector('.btn-primary:not(.auth-login-btn)');
        if (getStartedBtn) getStartedBtn.style.display = 'none';

        const langSwitcher = navRight.querySelector('.lang-switcher');
        if (langSwitcher) {
            navRight.insertBefore(loginBtn, langSwitcher);
            navRight.insertBefore(profileEl, langSwitcher);
        } else {
            navRight.appendChild(loginBtn);
            navRight.appendChild(profileEl);
        }
    });
}

// ===== SHOW LOGIN MODAL (Glassmorphism Design) =====
function showLoginModal(mode = 'login') {
    if (document.getElementById('authOverlay')) return;
    injectAuthStyles();

    const isLogin = mode === 'login';

    const overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.className = 'auth-overlay';
    overlay.innerHTML = `
        <div class="auth-overlay-bg"></div>
        <div class="auth-overlay-blur"></div>
        <div class="auth-card">
            <button class="auth-card-close" id="authClose">✕</button>

            <img src="/assets/logo.svg" alt="LocalServe" class="auth-card-logo"
                 onerror="this.style.display='none'" />

            <h1>${isLogin ? 'Welcome Back 👋' : 'Create Account ✨'}</h1>

            <form class="auth-card-form" id="authForm">
                ${!isLogin ? `<input type="text" id="authName" class="auth-card-input" placeholder="Full Name" required />` : ''}
                <input type="email" id="authEmail" class="auth-card-input" placeholder="Email" required />
                <input type="password" id="authPassword" class="auth-card-input" placeholder="Password" required minlength="4" />

                <button type="submit" class="auth-btn-primary" id="authSubmitBtn">
                    ${isLogin ? 'Sign In' : 'Create Account'}
                </button>

                <div class="auth-card-divider">or</div>

                <button type="button" class="auth-btn-google" id="authGoogleBtn">
                    ${GOOGLE_SVG}
                    Continue with Google
                </button>
            </form>

            <p class="auth-card-error" id="authError"></p>

            <div class="auth-card-footer">
                <span>${isLogin ? "Don't have an account?" : "Already have an account?"}</span>
                <a href="#" id="authToggle">${isLogin ? 'Sign up' : 'Sign in'}</a>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    overlay.querySelector('#authClose').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.auth-overlay-blur').addEventListener('click', () => overlay.remove());

    // Toggle login/register
    overlay.querySelector('#authToggle').addEventListener('click', (e) => {
        e.preventDefault();
        overlay.remove();
        showLoginModal(isLogin ? 'register' : 'login');
    });

    // Google button — triggers GIS popup
    overlay.querySelector('#authGoogleBtn').addEventListener('click', () => {
        if (window.google && window.google.accounts) {
            window.google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // Fallback: render popup
                    showToast('⚠️ Google popup was blocked. Please allow popups and try again.');
                }
            });
        } else {
            showToast('⚠️ Google Sign-In is loading. Please try again in a moment.');
        }
    });

    // Form submit
    overlay.querySelector('#authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = overlay.querySelector('#authEmail').value.trim();
        const password = overlay.querySelector('#authPassword').value;
        const name = overlay.querySelector('#authName')?.value.trim();
        const errorEl = overlay.querySelector('#authError');
        const submitBtn = overlay.querySelector('#authSubmitBtn');

        errorEl.style.display = 'none';

        // ===== CLIENT-SIDE VALIDATION =====
        if (!EMAIL_REGEX.test(email)) {
            errorEl.textContent = 'Invalid email format.';
            errorEl.style.display = 'block';
            return;
        }

        if (!isLogin) {
            if (password.length < 4) {
                errorEl.textContent = 'Password must be at least 4 characters.';
                errorEl.style.display = 'block';
                return;
            }
        }

        submitBtn.disabled = true;
        submitBtn.textContent = isLogin ? 'Signing in...' : 'Creating account...';

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const body = isLogin
                ? { email, password }
                : { name: name || 'User', email, password };

            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Something went wrong');

            setToken(data.token);
            setSavedUser(data.user);
            currentUser = data.user;
            updateAuthUI(data.user);
            showToast('\u2705 ' + (isLogin ? 'Signed in as ' : 'Welcome, ') + data.user.name);
            overlay.remove();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = isLogin ? 'Sign In' : 'Create Account';
        }
    });

    // Autofocus
    setTimeout(() => overlay.querySelector('#authEmail')?.focus(), 100);
}

// ===== HANDLERS =====
async function handleLogout() {
    clearToken();
    currentUser = null;
    updateAuthUI(null);
    showToast('👋 Signed out');
}

// ===== TOAST =====
export function showToast(message, duration = 3000) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===== REQUIRE AUTH =====
export function requireAuth() {
    if (!currentUser) {
        showLoginModal();
        return null;
    }
    return currentUser;
}

export function getUser() {
    return currentUser;
}

// ===== INIT =====
export async function initAuth() {
    loadGIS();
    createAuthElements();

    const token = getToken();
    if (token) {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.user) {
                currentUser = data.user;
                setSavedUser(data.user);
                updateAuthUI(data.user);
            } else {
                clearToken();
                updateAuthUI(null);
            }
        } catch (e) {
            clearToken();
            updateAuthUI(null);
        }
    } else {
        updateAuthUI(null);
    }
}

// ===== AUTH UI MODULE =====
import { loginWithGoogle, logout, onAuthChange, getCurrentUser } from './firebase.js';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase.js';

let currentUser = null;

// ===== SAVE USER PROFILE TO FIRESTORE =====
async function saveUserProfile(user) {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, {
            name: user.displayName || 'User',
            email: user.email,
            photoURL: user.photoURL || null,
            phone: '',
            role: 'user',
            skills: [],
            location: '',
            createdAt: new Date().toISOString()
        });
    }
}

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
                    avatar.textContent = (user.displayName || 'U')[0].toUpperCase();
                }
            }
            if (name) name.textContent = user.displayName || 'User';
        } else {
            el.style.display = 'none';
        }
    });

    // Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
}

// ===== CREATE AUTH HTML =====
function createAuthElements() {
    // Login button for navbar
    document.querySelectorAll('.nav-right').forEach(navRight => {
        if (navRight.querySelector('.auth-login-btn')) return;

        const loginBtn = document.createElement('button');
        loginBtn.className = 'btn btn-primary btn-sm auth-login-btn';
        loginBtn.innerHTML = '👤 Sign In';
        loginBtn.addEventListener('click', handleLogin);

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

        // Insert before existing Get Started button or at end
        const getStartedBtn = navRight.querySelector('.btn-primary:not(.auth-login-btn)');
        if (getStartedBtn) {
            getStartedBtn.style.display = 'none'; // hide static Get Started
        }
        navRight.appendChild(loginBtn);
        navRight.appendChild(profileEl);
    });
}

// ===== LOGIN MODAL =====
function showLoginModal() {
    if (document.getElementById('authModal')) return;

    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
        <div class="auth-modal">
            <button class="auth-modal-close">✕</button>
            <div class="auth-modal-icon">🔐</div>
            <h3>Sign in to LocalServe</h3>
            <p>Connect with workers, post jobs, and chat — all in one place.</p>
            <button class="btn btn-primary btn-lg auth-google-btn" style="width:100%;gap:12px;">
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Sign in with Google
            </button>
            <p class="auth-modal-note">Your data is secure. We only access your name and email.</p>
        </div>
    `;

    modal.querySelector('.auth-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelector('.auth-google-btn').addEventListener('click', async () => {
        try {
            await handleLogin();
            modal.remove();
        } catch (e) { /* error shown by handleLogin */ }
    });

    document.body.appendChild(modal);
}

// ===== HANDLERS =====
async function handleLogin() {
    try {
        const user = await loginWithGoogle();
        await saveUserProfile(user);
        showToast('✅ Signed in as ' + user.displayName);
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            showToast('❌ Sign-in failed. Please try again.');
        }
    }
}

async function handleLogout() {
    await logout();
    showToast('👋 Signed out');
}

// ===== TOAST NOTIFICATION =====
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
export function initAuth() {
    createAuthElements();
    onAuthChange(updateAuthUI);
}

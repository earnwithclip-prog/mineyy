// ===== FIREBASE.JS — COMPATIBILITY SHIM =====
// Firebase has been removed. This file re-exports from the new api.js + auth.js
// so that any leftover imports from other files still work.

import { getToken, clearToken, getSavedUser } from './api.js';
import { initAuth, getUser, requireAuth, showToast } from './auth.js';

// Re-export auth helpers with the same names other files expect
export async function loginWithGoogle() {
    // No Google sign-in — just open the login modal
    requireAuth();
    return getUser();
}

export async function logout() {
    clearToken();
    window.location.reload();
}

export function onAuthChange(callback) {
    // Run callback with saved user on next tick, then listen for auth events
    setTimeout(() => {
        callback(getUser());
    }, 100);

    window.addEventListener('authStateChanged', (e) => {
        callback(e.detail?.user || null);
    });
}

export function getCurrentUser() {
    return getUser();
}

// No Firestore db export — modules have been rewritten
export const db = null;
export const auth = null;

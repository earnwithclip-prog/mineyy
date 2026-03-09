// ===== FIREBASE INITIALIZATION =====
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDK-ATv6qFI8YFfqmq-SXF4Uym5aBWZB2I",
    authDomain: "localserve-app.firebaseapp.com",
    projectId: "localserve-app",
    storageBucket: "localserve-app.firebasestorage.app",
    messagingSenderId: "424359387986",
    appId: "1:424359387986:web:a6080c869c1182c1be508b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ===== AUTH HELPERS =====
export async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
}

export async function logout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
    return auth.currentUser;
}

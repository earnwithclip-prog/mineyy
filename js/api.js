// ===== API HELPER — replaces firebase.js =====
// Handles token storage and all API calls to the Express backend.

const API_BASE = 'http://localhost:5000/api';

// ===== TOKEN MANAGEMENT =====
export function getToken() {
    return localStorage.getItem('ls_token');
}

export function setToken(token) {
    localStorage.setItem('ls_token', token);
}

export function clearToken() {
    localStorage.removeItem('ls_token');
    localStorage.removeItem('ls_user');
}

export function getSavedUser() {
    try {
        const u = localStorage.getItem('ls_user');
        return u ? JSON.parse(u) : null;
    } catch { return null; }
}

export function setSavedUser(user) {
    localStorage.setItem('ls_user', JSON.stringify(user));
}

// ===== FETCH WRAPPER =====
async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
        const err = new Error(data.message || 'Request failed');
        err.status = res.status;
        throw err;
    }
    return data;
}

// ===== AUTH API =====
export async function apiGoogleLogin(credential) {
    const data = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential })
    });
    setToken(data.token);
    setSavedUser(data.user);
    return data.user;
}

export async function apiGetMe() {
    return apiFetch('/auth/me');
}

// ===== BOOKING API =====
export async function apiCreateBooking(bookingData) {
    return apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
    });
}

export async function apiGetMyBookings() {
    return apiFetch('/bookings/my');
}

export async function apiGetPendingBookings() {
    return apiFetch('/bookings/pending');
}

export async function apiUpdateBookingStatus(bookingId, status) {
    return apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
}

export async function apiPayBooking(bookingId) {
    return apiFetch(`/bookings/${bookingId}/pay`, { method: 'POST' });
}

// ===== JOBS API =====
export async function apiPostJob(jobData) {
    return apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData)
    });
}

export async function apiGetJobs(search) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiFetch(`/jobs${q}`);
}

export async function apiGetMyJobs() {
    return apiFetch('/jobs/my');
}

export async function apiApplyToJob(jobId, coverNote) {
    return apiFetch(`/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ coverNote })
    });
}

export async function apiGetApplications(jobId) {
    return apiFetch(`/jobs/${jobId}/applications`);
}

// ===== WORKERS API =====
export async function apiGetWorkers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/workers${q ? '?' + q : ''}`);
}

export async function apiUpdateWorkerProfile(profileData) {
    return apiFetch('/workers/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
}

export async function apiRegisterAsWorker(workerData) {
    return apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ ...workerData, role: 'worker' })
    });
}

// ===== CHAT API =====
export async function apiGetChat(chatId) {
    return apiFetch(`/chats/${chatId}`);
}

export async function apiGetMessages(chatId, after) {
    const q = after ? `?after=${encodeURIComponent(after)}` : '';
    return apiFetch(`/chats/${chatId}/messages${q}`);
}

export async function apiSendMessage(chatId, text) {
    return apiFetch(`/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text })
    });
}

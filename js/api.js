// ===== API HELPER — Express + JWT Backend =====
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://mineyy-server.onrender.com/api';
const TOKEN_KEY = 'localserve_token';
const USER_KEY = 'localserve_user';

// ===== TOKEN MANAGEMENT =====
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
export function getSavedUser() {
    try { const d = localStorage.getItem(USER_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
}
export function saveUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
export const setSavedUser = saveUser;

// ===== HTTP HELPER =====
async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API error');
    return data;
}

// ===== AUTH =====
export async function apiRegister(name, email, password) {
    const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    if (data.token) setToken(data.token);
    if (data.user) saveUser(data.user);
    return data;
}
export async function apiLogin(email, password) {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (data.token) setToken(data.token);
    if (data.user) saveUser(data.user);
    return data;
}
export async function apiGoogleAuth(credential) {
    const data = await apiFetch('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
    if (data.token) setToken(data.token);
    if (data.user) saveUser(data.user);
    return data;
}
export async function apiGetMe() {
    const data = await apiFetch('/auth/me');
    if (data.user) saveUser(data.user);
    return data;
}
export async function apiUpdateProfile(updates) {
    const data = await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(updates) });
    if (data.user) saveUser(data.user);
    return data;
}

// ===== WORKERS =====
export async function apiGetWorkers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch('/workers' + (qs ? `?${qs}` : ''));
}
export async function apiGetWorker(id) { return apiFetch(`/workers/${id}`); }
export async function apiUpdateWorkerProfile(updates) {
    return apiFetch('/workers/profile', { method: 'PUT', body: JSON.stringify(updates) });
}
export async function apiRegisterAsWorker(data) { return apiUpdateProfile({ role: 'worker', ...data }); }
export async function apiToggleAvailability(isAvailable, coordinates) {
    return apiFetch('/workers/availability', { method: 'PATCH', body: JSON.stringify({ isAvailable, coordinates }) });
}

// ===== BOOKINGS =====
export async function apiCreateBooking(data) {
    return apiFetch('/bookings', { method: 'POST', body: JSON.stringify(data) });
}
export async function apiGetMyBookings() { return apiFetch('/bookings/my'); }
export async function apiGetWorkerBookings() { return apiFetch('/bookings/worker'); }
export async function apiGetPendingBookings() { return apiFetch('/bookings/pending'); }
export async function apiGetNearbyBookings(lat, lng, radius = 10, category) {
    const params = new URLSearchParams({ lat, lng, radius });
    if (category) params.set('category', category);
    return apiFetch(`/bookings/nearby?${params.toString()}`);
}
export async function apiUpdateBookingStatus(id, status) {
    return apiFetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
export async function apiCancelBooking(id, reason = '') {
    return apiFetch(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
}
export async function apiCompleteBooking(id) {
    return apiFetch(`/bookings/${id}/complete`, { method: 'PATCH' });
}
export async function apiRateBooking(id, rating, feedback = '') {
    return apiFetch(`/bookings/${id}/rate`, { method: 'POST', body: JSON.stringify({ rating, feedback }) });
}
export async function apiPayBooking(id, amount) {
    return apiFetch(`/bookings/${id}/pay`, { method: 'POST', body: JSON.stringify({ amount }) });
}

// ===== JOBS =====
export async function apiPostJob(data) {
    return apiFetch('/jobs', { method: 'POST', body: JSON.stringify(data) });
}
export async function apiGetJobs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch('/jobs' + (qs ? `?${qs}` : ''));
}
export async function apiGetMyJobs() { return apiFetch('/jobs/my'); }
export async function apiApplyToJob(jobId, coverNote) {
    return apiFetch(`/jobs/${jobId}/apply`, { method: 'POST', body: JSON.stringify({ coverNote }) });
}
export async function apiApplyWithDetails(jobId, data) {
    return apiFetch(`/jobs/${jobId}/apply`, { method: 'POST', body: JSON.stringify(data) });
}
export async function apiGetJobApplications(jobId) { return apiFetch(`/jobs/${jobId}/applications`); }
export async function apiGetMyApplications() { return apiFetch('/jobs/applications/my'); }
export async function apiGetIncomingApplications() { return apiFetch('/jobs/applications/incoming'); }
export async function apiUpdateApplicationStatus(applicationId, status) {
    return apiFetch(`/jobs/applications/${applicationId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
export async function apiCloseJob(jobId) {
    return apiFetch(`/jobs/${jobId}/close`, { method: 'PATCH' });
}

// ===== CHATS =====
export async function apiGetMyChats() { return apiFetch('/chats'); }
export async function apiGetChat(chatId) { return apiFetch(`/chats/${chatId}`); }
export async function apiGetMessages(chatId, since) {
    const qs = since ? `?after=${encodeURIComponent(since)}` : '';
    return apiFetch(`/chats/${chatId}/messages${qs}`);
}
export async function apiSendMessage(chatId, text) {
    return apiFetch(`/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
}

// ===== NOTIFICATIONS =====
export async function apiGetNotifications() { return apiFetch('/notifications'); }
export async function apiMarkAllNotificationsRead() { return apiFetch('/notifications/read-all', { method: 'PATCH' }); }
export async function apiMarkNotificationRead(id) { return apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }); }

// ===== LOCATIONS =====
export async function apiSaveLocation(lat, lng, accuracy) {
    return apiFetch('/locations', { method: 'POST', body: JSON.stringify({ lat, lng, accuracy }) });
}
export async function apiGetWorkerLocation(userId) { return apiFetch(`/locations/${userId}`); }

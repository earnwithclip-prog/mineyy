// ===== NOTIFICATIONS MODULE — Bell Icon + Polling =====
import { apiGetNotifications, apiMarkAllNotificationsRead, apiMarkNotificationRead } from './api.js';
import { getToken } from './api.js';
import { openChat } from './chat.js';

let pollTimer = null;
let bellEl = null;
let badgeEl = null;
let dropdownEl = null;
let notifVisible = false;

// ===== INJECT BELL INTO NAVBAR =====
function injectBell() {
    document.querySelectorAll('.nav-right').forEach(navRight => {
        if (navRight.querySelector('.notif-bell')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'notif-wrapper';
        wrapper.style.cssText = 'position:relative;display:inline-flex;align-items:center;';

        const bell = document.createElement('button');
        bell.className = 'notif-bell';
        bell.innerHTML = '🔔';
        bell.title = 'Notifications';

        const badge = document.createElement('span');
        badge.className = 'notif-badge';
        badge.style.display = 'none';
        badge.textContent = '0';

        const dropdown = document.createElement('div');
        dropdown.className = 'notif-dropdown';
        dropdown.style.display = 'none';
        dropdown.innerHTML = '<div class="notif-header"><span>Notifications</span><button class="notif-mark-all">Mark all read</button></div><div class="notif-list"><div class="notif-empty">No notifications yet</div></div>';

        wrapper.appendChild(bell);
        wrapper.appendChild(badge);
        wrapper.appendChild(dropdown);

        const langSwitcher = navRight.querySelector('.lang-switcher');
        if (langSwitcher) {
            navRight.insertBefore(wrapper, langSwitcher);
        } else {
            navRight.prepend(wrapper);
        }

        bellEl = bell;
        badgeEl = badge;
        dropdownEl = dropdown;

        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });

        dropdown.querySelector('.notif-mark-all').addEventListener('click', async (e) => {
            e.stopPropagation();
            await apiMarkAllNotificationsRead();
            badge.style.display = 'none';
            badge.textContent = '0';
            fetchNotifications();
        });

        document.addEventListener('click', () => { hideDropdown(); });
    });

    injectNotifStyles();
}

function toggleDropdown() {
    notifVisible = !notifVisible;
    if (dropdownEl) dropdownEl.style.display = notifVisible ? 'block' : 'none';
    if (notifVisible) fetchNotifications();
}

function hideDropdown() {
    notifVisible = false;
    if (dropdownEl) dropdownEl.style.display = 'none';
}

// ===== FETCH & RENDER NOTIFICATIONS =====
async function fetchNotifications() {
    if (!getToken()) return;
    try {
        const data = await apiGetNotifications();
        const notifications = data.notifications || [];
        const unread = data.unread || 0;

        // Update badge
        if (badgeEl) {
            badgeEl.textContent = unread > 9 ? '9+' : unread;
            badgeEl.style.display = unread > 0 ? 'flex' : 'none';
        }

        // Update dropdown
        if (dropdownEl) {
            const listEl = dropdownEl.querySelector('.notif-list');
            if (!listEl) return;

            if (notifications.length === 0) {
                listEl.innerHTML = '<div class="notif-empty">No notifications yet</div>';
                return;
            }

            listEl.innerHTML = notifications.map(n => `
                <div class="notif-item ${n.read ? '' : 'notif-unread'}" data-id="${n._id}" data-ref="${n.refId || ''}">
                    <div class="notif-icon">${getNotifIcon(n.type)}</div>
                    <div class="notif-body">
                        <div class="notif-text">${n.text}</div>
                        <div class="notif-time">${timeAgo(new Date(n.createdAt))}</div>
                    </div>
                </div>
            `).join('');

            // Wire clicks
            listEl.querySelectorAll('.notif-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const id = item.dataset.id;
                    const refId = item.dataset.ref;
                    await apiMarkNotificationRead(id);
                    item.classList.remove('notif-unread');
                    if (refId && refId.length === 24) {
                        // Try to open as chat
                        hideDropdown();
                        openChat(refId);
                    }
                    fetchNotifications();
                });
            });
        }
    } catch (e) {
        // Not logged in or error — ignore silently
    }
}

function getNotifIcon(type) {
    const icons = {
        application: '📋', accepted: '✅', rejected: '❌',
        message: '💬', booking_accepted: '🔧', booking_created: '📅'
    };
    return icons[type] || '🔔';
}

function timeAgo(date) {
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
}

// ===== START POLLING =====
function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(fetchNotifications, 15000); // every 15s
    fetchNotifications(); // immediate
}

// ===== STYLES =====
function injectNotifStyles() {
    if (document.getElementById('notifStyles')) return;
    const style = document.createElement('style');
    style.id = 'notifStyles';
    style.textContent = `
        .notif-bell {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 6px 8px;
            border-radius: 8px;
            transition: background 0.2s;
            position: relative;
            line-height: 1;
        }
        .notif-bell:hover { background: rgba(0,0,0,0.06); }
        .notif-badge {
            position: absolute;
            top: 0; right: 0;
            min-width: 18px; height: 18px;
            background: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: 700;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            pointer-events: none;
        }
        .notif-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            width: 320px;
            max-height: 400px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.18);
            border: 1px solid rgba(0,0,0,0.08);
            z-index: 10000;
            overflow: hidden;
        }
        .notif-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            font-weight: 700;
            font-size: 14px;
            border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .notif-mark-all {
            background: none;
            border: none;
            color: #7c3aed;
            font-size: 12px;
            cursor: pointer;
            font-weight: 600;
        }
        .notif-list {
            overflow-y: auto;
            max-height: 340px;
        }
        .notif-empty {
            text-align: center;
            padding: 32px 16px;
            color: #9ca3af;
            font-size: 14px;
        }
        .notif-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 16px;
            cursor: pointer;
            transition: background 0.15s;
            border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .notif-item:hover { background: #f9fafb; }
        .notif-unread { background: #faf5ff; }
        .notif-unread:hover { background: #f3e8ff; }
        .notif-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
        .notif-body { flex: 1; }
        .notif-text { font-size: 13px; color: #1f2937; line-height: 1.4; }
        .notif-time { font-size: 11px; color: #9ca3af; margin-top: 3px; }
        @media (max-width: 480px) {
            .notif-dropdown { width: 280px; right: -60px; }
        }
    `;
    document.head.appendChild(style);
}

// ===== INIT =====
export function initNotifications() {
    injectBell();
    // Start polling when user is logged in
    window.addEventListener('authStateChanged', (e) => {
        if (e.detail?.user) {
            startPolling();
        } else {
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            if (badgeEl) badgeEl.style.display = 'none';
        }
    });

    // Also start if already logged in
    if (getToken()) startPolling();
}

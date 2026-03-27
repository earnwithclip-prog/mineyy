// ===== REAL-TIME CHAT MODULE — Polling + Phone Visibility =====
import { apiGetChat, apiGetMessages, apiSendMessage, apiGetWorkerLocation, apiSaveLocation } from './api.js';
import { getUser, requireAuth } from './auth.js';

let activeChatId = null;
let chatPollTimer = null;
let lastMessageTime = null;
let trackingWatchId = null;
let isTracking = false;

// ===== CREATE CHAT UI =====
function createChatUI() {
    if (document.getElementById('chatWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'chatWidget';
    widget.className = 'chat-widget';
    widget.innerHTML = `
        <div class="chat-panel" id="chatPanel">
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-avatar">💬</div>
                    <div>
                        <div class="chat-partner-name">Chat</div>
                        <div class="chat-status">Connected</div>
                    </div>
                </div>
                <div class="chat-header-actions">
                    <button class="chat-minimize-btn" id="chatMinimize">—</button>
                    <button class="chat-close-btn" id="chatClose">✕</button>
                </div>
            </div>
            <!-- Phone info bar (shown after acceptance) -->
            <div class="chat-phone-bar" id="chatPhoneBar" style="display:none;"></div>
            <!-- Track location bar -->
            <div class="chat-track-bar" id="chatTrackBar" style="display:none;"></div>
            <div class="chat-messages" id="chatMessages">
                <div class="chat-empty">
                    <div style="font-size: 48px;">💬</div>
                    <p>Start the conversation!</p>
                </div>
            </div>
            <div class="chat-input-bar">
                <input type="text" class="chat-input" id="chatInput" placeholder="Type a message..." />
                <button class="chat-send-btn" id="chatSend">➤</button>
            </div>
        </div>
        <button class="chat-fab" id="chatFab" style="display:none;">
            💬
            <span class="chat-badge" id="chatBadge" style="display:none;">0</span>
        </button>
    `;

    document.body.appendChild(widget);

    document.getElementById('chatClose').addEventListener('click', closeChat);
    document.getElementById('chatMinimize').addEventListener('click', minimizeChat);
    document.getElementById('chatFab').addEventListener('click', maximizeChat);
    document.getElementById('chatSend').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Inject extra chat styles
    if (!document.getElementById('chatExtraStyles')) {
        const style = document.createElement('style');
        style.id = 'chatExtraStyles';
        style.textContent = `
            .chat-phone-bar {
                background: linear-gradient(135deg, #d1fae5, #a7f3d0);
                border-bottom: 1px solid rgba(0,0,0,0.08);
                padding: 8px 16px;
                font-size: 13px;
                font-weight: 600;
                color: #065f46;
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            .chat-track-bar {
                background: linear-gradient(135deg, #ede9fe, #ddd6fe);
                border-bottom: 1px solid rgba(0,0,0,0.08);
                padding: 8px 16px;
                font-size: 13px;
                color: #4c1d95;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .chat-track-bar button {
                padding: 4px 12px;
                border: none;
                border-radius: 6px;
                background: #7c3aed;
                color: white;
                font-size: 12px;
                cursor: pointer;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }
}

// ===== OPEN CHAT =====
export function openChat(chatId) {
    createChatUI();
    activeChatId = chatId;
    lastMessageTime = null;

    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFab');

    panel.classList.add('open');
    fab.style.display = 'none';

    loadChatInfo(chatId);
    pollMessages();
    if (chatPollTimer) clearInterval(chatPollTimer);
    chatPollTimer = setInterval(pollMessages, 3000);
}

// ===== LOAD CHAT INFO (phone visibility + partner name) =====
async function loadChatInfo(chatId) {
    try {
        const data = await apiGetChat(chatId);
        const chat = data.chat;
        const currentUser = getUser();

        // Identify partner
        const partner = chat.participants?.find(p => p._id !== currentUser?._id);
        const partnerName = partner?.name || (chat.type === 'booking' ? 'Service Chat' : 'Job Chat');

        const nameEl = document.querySelector('.chat-partner-name');
        if (nameEl) nameEl.textContent = partnerName;

        // Phone visibility — show phone for ALL chat participants (acceptance happened by chat creation)
        const phoneBar = document.getElementById('chatPhoneBar');
        if (phoneBar) {
            const phones = [];
            if (currentUser?.phone) phones.push(`You: ${currentUser.phone}`);
            if (partner?.phone) phones.push(`${partner.name}: ${partner.phone}`);

            if (phones.length > 0) {
                phoneBar.innerHTML = `📞 Contact: ${phones.join(' &nbsp;|&nbsp; ')}`;
                phoneBar.style.display = 'flex';
            } else {
                phoneBar.innerHTML = `📞 Phone: <em>Not provided — ask them to add their phone in profile</em>`;
                phoneBar.style.display = 'flex';
            }
        }

        // Track bar — show if partner is a worker (booking chat)
        const trackBar = document.getElementById('chatTrackBar');
        if (trackBar && chat.type === 'booking' && partner) {
            trackBar.innerHTML = `
                📍 <span id="trackStatus">Track worker location</span>
                <button id="trackBtn">📍 Start Tracking</button>
            `;
            trackBar.style.display = 'flex';
            setupTracking(partner._id);
        }

    } catch (e) {
        console.error('Load chat info error:', e);
    }
}

// ===== LOCATION TRACKING =====
function setupTracking(workerId) {
    const trackBtn = document.getElementById('trackBtn');
    if (!trackBtn) return;

    trackBtn.addEventListener('click', async () => {
        const statusEl = document.getElementById('trackStatus');
        try {
            const data = await apiGetWorkerLocation(workerId);
            const loc = data.location;
            if (statusEl) statusEl.textContent = `Worker at: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)} (updated ${new Date(loc.updatedAt).toLocaleTimeString()})`;
        } catch (e) {
            if (statusEl) statusEl.textContent = 'Worker location not available yet';
        }
    });
}

// Worker starts sharing their location
export function startLocationSharing() {
    if (isTracking || !navigator.geolocation) return;
    isTracking = true;
    trackingWatchId = navigator.geolocation.watchPosition(
        async (pos) => {
            try {
                await apiSaveLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
            } catch (e) { /* silent */ }
        },
        () => { isTracking = false; },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
}

export function stopLocationSharing() {
    if (trackingWatchId !== null) {
        navigator.geolocation.clearWatch(trackingWatchId);
        trackingWatchId = null;
        isTracking = false;
    }
}

// ===== POLL MESSAGES =====
async function pollMessages() {
    if (!activeChatId) return;
    try {
        const data = await apiGetMessages(activeChatId, lastMessageTime);
        const messages = data.messages || [];

        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            const newTime = lastMsg.createdAt || lastMsg.updatedAt;

            if (!lastMessageTime) {
                // First load — render all
                renderMessages(messages);
            } else {
                appendMessages(messages);
            }
            lastMessageTime = newTime;
        }
    } catch (e) {
        console.error('Poll messages error:', e);
    }
}

// ===== RENDER MESSAGES =====
function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const user = getUser();
    if (!user) return;

    if (messages.length === 0) {
        container.innerHTML = `<div class="chat-empty"><div style="font-size:48px">💬</div><p>Start the conversation!</p></div>`;
        return;
    }

    container.innerHTML = messages.map(msg => {
        const isMine = msg.senderId?.toString() === user._id?.toString();
        const time = msg.createdAt ? formatTime(new Date(msg.createdAt)) : '';
        return `
            <div class="chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}">
                <div class="chat-bubble">
                    ${!isMine ? `<div class="chat-sender">${msg.senderName || 'User'}</div>` : ''}
                    <div class="chat-text">${escapeHtml(msg.text)}</div>
                    <div class="chat-time">${time}</div>
                </div>
            </div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
}

// ===== APPEND MESSAGES =====
function appendMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const user = getUser();
    if (!user) return;

    const empty = container.querySelector('.chat-empty');
    if (empty) empty.remove();

    messages.forEach(msg => {
        const isMine = msg.senderId?.toString() === user._id?.toString();
        const time = msg.createdAt ? formatTime(new Date(msg.createdAt)) : '';
        const div = document.createElement('div');
        div.className = `chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}`;
        div.innerHTML = `
            <div class="chat-bubble">
                ${!isMine ? `<div class="chat-sender">${msg.senderName || 'User'}</div>` : ''}
                <div class="chat-text">${escapeHtml(msg.text)}</div>
                <div class="chat-time">${time}</div>
            </div>`;
        container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
}

// ===== SEND MESSAGE =====
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !activeChatId) return;
    const user = requireAuth();
    if (!user) return;

    input.value = '';
    try {
        await apiSendMessage(activeChatId, text);
        pollMessages();
    } catch (error) {
        console.error('Send message error:', error);
        input.value = text;
    }
}

// ===== MINIMIZE / MAXIMIZE / CLOSE =====
function minimizeChat() {
    document.getElementById('chatPanel').classList.remove('open');
    document.getElementById('chatFab').style.display = 'flex';
}
function maximizeChat() {
    document.getElementById('chatPanel').classList.add('open');
    document.getElementById('chatFab').style.display = 'none';
    pollMessages();
}
function closeChat() {
    document.getElementById('chatPanel').classList.remove('open');
    document.getElementById('chatFab').style.display = 'none';
    if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
    activeChatId = null;
    lastMessageTime = null;
    const phoneBar = document.getElementById('chatPhoneBar');
    if (phoneBar) { phoneBar.style.display = 'none'; phoneBar.innerHTML = ''; }
    const trackBar = document.getElementById('chatTrackBar');
    if (trackBar) { trackBar.style.display = 'none'; trackBar.innerHTML = ''; }
}

// ===== HELPERS =====
function formatTime(date) { return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

// ===== INIT =====
export function initChat() {
    createChatUI();
    window.addEventListener('openChat', (e) => {
        if (e.detail?.chatId) openChat(e.detail.chatId);
    });
}

// ===== REAL-TIME CHAT MODULE =====
import { db } from './firebase.js';
import {
    collection, addDoc, onSnapshot, query, orderBy,
    serverTimestamp, doc, getDoc
} from 'firebase/firestore';
import { getUser, requireAuth } from './auth.js';

let activeChatId = null;
let chatUnsubscribe = null;

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

    // Event listeners
    document.getElementById('chatClose').addEventListener('click', closeChat);
    document.getElementById('chatMinimize').addEventListener('click', minimizeChat);
    document.getElementById('chatFab').addEventListener('click', maximizeChat);
    document.getElementById('chatSend').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// ===== OPEN CHAT =====
export function openChat(chatId) {
    createChatUI();
    activeChatId = chatId;

    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFab');

    panel.classList.add('open');
    fab.style.display = 'none';

    // Load chat info
    loadChatInfo(chatId);

    // Listen for messages
    if (chatUnsubscribe) chatUnsubscribe();

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach(docSnap => {
            messages.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderMessages(messages);
    });
}

// ===== LOAD CHAT INFO =====
async function loadChatInfo(chatId) {
    try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (chatDoc.exists()) {
            const data = chatDoc.data();
            const user = getUser();
            const partnerName = document.querySelector('.chat-partner-name');
            if (partnerName) {
                if (data.type === 'booking') {
                    partnerName.textContent = 'Service Chat';
                } else {
                    partnerName.textContent = 'Job Chat';
                }
            }
        }
    } catch (e) {
        console.error('Load chat info error:', e);
    }
}

// ===== RENDER MESSAGES =====
function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const user = getUser();
    if (!user) return;

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="chat-empty">
                <div style="font-size: 48px;">💬</div>
                <p>Start the conversation!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(msg => {
        const isMine = msg.senderId === user.uid;
        const time = msg.timestamp?.toDate ? formatTime(msg.timestamp.toDate()) : '';

        return `
            <div class="chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}">
                <div class="chat-bubble">
                    ${!isMine ? `<div class="chat-sender">${msg.senderName || 'User'}</div>` : ''}
                    <div class="chat-text">${escapeHtml(msg.text)}</div>
                    <div class="chat-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// ===== SEND MESSAGE =====
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !activeChatId) return;

    const user = getUser();
    if (!user) return;

    input.value = '';

    try {
        await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
            senderId: user.uid,
            senderName: user.displayName || 'User',
            text,
            timestamp: serverTimestamp(),
            read: false
        });
    } catch (error) {
        console.error('Send message error:', error);
        input.value = text;
    }
}

// ===== MINIMIZE / MAXIMIZE / CLOSE =====
function minimizeChat() {
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFab');
    panel.classList.remove('open');
    fab.style.display = 'flex';
}

function maximizeChat() {
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFab');
    panel.classList.add('open');
    fab.style.display = 'none';
}

function closeChat() {
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFab');
    panel.classList.remove('open');
    fab.style.display = 'none';
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
    activeChatId = null;
}

// ===== HELPERS =====
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== INIT =====
export function initChat() {
    createChatUI();

    // Listen for openChat events from other modules
    window.addEventListener('openChat', (e) => {
        if (e.detail?.chatId) {
            openChat(e.detail.chatId);
        }
    });
}

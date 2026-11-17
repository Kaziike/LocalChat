// =========================================================
// DEVICE IDENTITY & ROOM CODE (Định danh bền vững & Mã phòng)
// =========================================================
function getOrCreateDeviceId() {
    let id = localStorage.getItem('localchat_device_id');
    if (!id) {
        id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('localchat_device_id', id);
    }
    return id;
}

function normalizeRoomCode(code) {
    if (typeof code !== 'string') return '';
    const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').substring(0, 32);
    return cleaned.length >= 2 ? cleaned : '';
}

function getInitialRoomCode() {
    try {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = normalizeRoomCode(params.get('room') || '');
        if (fromUrl) {
            localStorage.setItem('localchat_room_code', fromUrl);
            return fromUrl;
        }
        return normalizeRoomCode(localStorage.getItem('localchat_room_code') || '');
    } catch (e) {
        return '';
    }
}

const myDeviceId = getOrCreateDeviceId();
let currentRoomCode = getInitialRoomCode();

function buildSocketAuth() {
    return {
        deviceId: myDeviceId,
        name: localStorage.getItem('localchat_display_name') || '',
        roomCode: currentRoomCode
    };
}

const socket = io({
    auth: buildSocketAuth(),
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
});

// UI Elements
const appContainer = document.getElementById('app-container');
const chatList = document.getElementById('chat-list');
const messagesContainer = document.getElementById('messages-container');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const currentChatName = document.getElementById('current-chat-name');
const currentChatSubtitle = document.getElementById('current-chat-subtitle');
const currentChatAvatar = document.getElementById('current-chat-avatar');
const fileInput = document.getElementById('file-input');
const attachBtn = document.getElementById('attach-btn');
const mobileBackBtn = document.getElementById('mobile-back-btn');
const pinnedMessageContainer = document.getElementById('pinned-message-container');
const pinnedText = document.getElementById('pinned-text');
const togglePinnedBtn = document.getElementById('toggle-pinned-btn');
const pinnedCaretIcon = document.getElementById('pinned-caret-icon');

// Call Buttons
const voiceCallBtn = document.getElementById('voice-call-btn');
const videoCallBtn = document.getElementById('video-call-btn');

// Connection Status & Room UI
const connectionStatus = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');
const roomBanner = document.getElementById('room-banner');
const roomBannerIcon = document.getElementById('room-banner-icon');
const roomModeLabel = document.getElementById('room-mode-label');
const roomIdLabel = document.getElementById('room-id-label');
const openRoomModalBtn = document.getElementById('open-room-modal-btn');

// Room Modal UI
const roomModal = document.getElementById('room-modal');
const closeRoomModalBtn = document.getElementById('close-room-modal-btn');
const cancelRoomBtn = document.getElementById('cancel-room-btn');
const roomShareCard = document.getElementById('room-share-card');
const roomQrWrap = document.getElementById('room-qr-wrap');
const currentRoomCodeDisplay = document.getElementById('current-room-code-display');
const copyRoomLinkBtn = document.getElementById('copy-room-link-btn');
const autoRoomBtn = document.getElementById('auto-room-btn');
const roomJoinForm = document.getElementById('room-join-form');
const roomCodeInput = document.getElementById('room-code-input');
const randomRoomBtn = document.getElementById('random-room-btn');

// Transfer Progress UI
const transferProgressCard = document.getElementById('transfer-progress-card');
const transferFilename = document.getElementById('transfer-filename');
const transferStats = document.getElementById('transfer-stats');
const progressBarFill = document.getElementById('progress-bar-fill');

// Profile & Rename UI
const myDisplayName = document.getElementById('my-display-name');
const myIpLabel = document.getElementById('my-ip-label');
const renameBtn = document.getElementById('rename-btn');
const renameModal = document.getElementById('rename-modal');
const renameForm = document.getElementById('rename-form');
const cancelRenameBtn = document.getElementById('cancel-rename-btn');
const newNameInput = document.getElementById('new-name-input');

// Search UI
const userSearchInput = document.getElementById('user-search-input');
const clearUserSearchBtn = document.getElementById('clear-user-search-btn');
const messageSearchContainer = document.getElementById('message-search-container');
const toggleMsgSearchBtn = document.getElementById('toggle-msg-search-btn');
const closeMsgSearchBtn = document.getElementById('close-msg-search-btn');
const messageSearchInput = document.getElementById('message-search-input');

// Image & Video Modal UI
const imageModal = document.getElementById('image-modal');
const imageModalImg = document.getElementById('image-modal-img');
const imageModalTitle = document.getElementById('image-modal-title');
const imageModalDownload = document.getElementById('image-modal-download');
const imageModalClose = document.getElementById('image-modal-close');

const videoModal = document.getElementById('video-modal');
const videoModalClose = document.getElementById('video-modal-close');
const videoModalPlayer = document.getElementById('video-modal-player');
const videoModalTitle = document.getElementById('video-modal-title');
const videoModalDownload = document.getElementById('video-modal-download');

// Conversation Info Drawer UI
const toggleChatInfoBtn = document.getElementById('toggle-chat-info-btn');
const chatInfoDrawer = document.getElementById('chat-info-drawer');
const closeChatInfoBtn = document.getElementById('close-chat-info-btn');
const drawerChatAvatar = document.getElementById('drawer-chat-avatar');
const drawerChatTitle = document.getElementById('drawer-chat-title');
const drawerChatSubtitle = document.getElementById('drawer-chat-subtitle');
const drawerQuickActions = document.getElementById('drawer-quick-actions');
const drawerVoiceCallBtn = document.getElementById('drawer-voice-call-btn');
const drawerVideoCallBtn = document.getElementById('drawer-video-call-btn');
const drawerMembersSection = document.getElementById('drawer-members-section');
const drawerMembersToggle = document.getElementById('drawer-members-toggle');
const drawerMembersHeading = document.getElementById('drawer-members-heading');
const drawerMembersBody = document.getElementById('drawer-members-body');
const drawerMembersList = document.getElementById('drawer-members-list');
const drawerPinSection = document.getElementById('drawer-pin-section');
const drawerPinToggle = document.getElementById('drawer-pin-toggle');
const drawerPinBody = document.getElementById('drawer-pin-body');
const drawerPinCurrent = document.getElementById('drawer-pin-current');
const drawerPinForm = document.getElementById('drawer-pin-form');
const drawerPinInput = document.getElementById('drawer-pin-input');
const drawerPinClearBtn = document.getElementById('drawer-pin-clear-btn');
const drawerPinResetBtn = document.getElementById('drawer-pin-reset-btn');
const drawerMediaSection = document.getElementById('drawer-media-section');
const drawerMediaToggles = document.querySelectorAll('.drawer-media-toggle');
const drawerMediaMoreButtons = document.querySelectorAll('[data-drawer-media-more]');
const drawerMediaContents = {
    images: document.querySelector('[data-drawer-media-content="images"]'),
    files: document.querySelector('[data-drawer-media-content="files"]'),
    links: document.querySelector('[data-drawer-media-content="links"]')
};
const countMediaImages = document.getElementById('count-media-images');
const countMediaFiles = document.getElementById('count-media-files');
const countMediaLinks = document.getElementById('count-media-links');
const drawerStorageStats = document.getElementById('drawer-storage-stats');
const clearCurrentChatCacheBtn = document.getElementById('clear-current-chat-cache-btn');
const drawerOpenGlobalStorageBtn = document.getElementById('drawer-open-global-storage-btn');

// Global Cache & Settings Modal UI
const openStorageModalBtn = document.getElementById('open-storage-modal-btn');
const storageModal = document.getElementById('storage-modal');
const closeStorageModalBtn = document.getElementById('close-storage-modal-btn');
const storageTotalMsgs = document.getElementById('storage-total-msgs');
const storageTotalFiles = document.getElementById('storage-total-files');
const storageBrowserQuota = document.getElementById('storage-browser-quota');
const settingHistoryLimit = document.getElementById('setting-history-limit');
const settingSaveMedia = document.getElementById('setting-save-media');
const settingSoundEnabled = document.getElementById('setting-sound-enabled');
const storageChatList = document.getElementById('storage-chat-list');
const clearAllMediaBtn = document.getElementById('clear-all-media-btn');
const clearAllCacheBtn = document.getElementById('clear-all-cache-btn');

// Call Modals UI
const incomingCallModal = document.getElementById('incoming-call-modal');
const callerNameElem = document.getElementById('caller-name');
const callTypeLabelElem = document.getElementById('call-type-label');
const acceptCallBtn = document.getElementById('accept-call-btn');
const declineCallBtn = document.getElementById('decline-call-btn');

const activeCallModal = document.getElementById('active-call-modal');
const callPeerName = document.getElementById('call-peer-name');
const callTimer = document.getElementById('call-timer');
const remoteVideo = document.getElementById('remote-video');
const localVideo = document.getElementById('local-video');
const remoteAvatarFallback = document.getElementById('remote-avatar-fallback');
const callStatusSub = document.getElementById('call-status-sub');
const toggleMicBtn = document.getElementById('toggle-mic-btn');
const toggleCamBtn = document.getElementById('toggle-cam-btn');
const endCallBtn = document.getElementById('end-call-btn');
const micIcon = document.getElementById('mic-icon');
const camIcon = document.getElementById('cam-icon');

// Settings & Pinned State
const SETTINGS_STORAGE_KEY = 'localchat_settings_v1';
const PINNED_STORAGE_KEY = 'localchat_pinned_v1';
const DEFAULT_GENERAL_PIN = 'Hệ thống: Kênh trao đổi nội bộ qua Wi-Fi (P2P tốc độ cao, không lưu đám mây)';

function loadAppSettings() {
    const defaults = { historyLimit: 50, saveMedia: true, soundEnabled: true };
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        const parsedLimit = Number(parsed.historyLimit);
        return {
            historyLimit: Number.isFinite(parsedLimit) && parsedLimit >= 0 ? parsedLimit : 50,
            saveMedia: typeof parsed.saveMedia === 'boolean' ? parsed.saveMedia : true,
            soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true
        };
    } catch (e) {
        return defaults;
    }
}

function saveAppSettings() {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
    } catch (e) {}
}

let appSettings = loadAppSettings();

function loadPersistedPins() {
    try {
        const raw = localStorage.getItem(PINNED_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') {
            return {
                general: parsed.general || null,
                peers: (parsed.peers && typeof parsed.peers === 'object') ? parsed.peers : {}
            };
        }
    } catch (e) {}
    return { general: null, peers: {} };
}

function savePersistedPins() {
    try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedMessages));
    } catch (e) {}
}

let pinnedMessages = loadPersistedPins();

// State
let myInfo = null;
let users = [];
let currentActiveChat = 'general'; // 'general' or socket.id
let chatHistory = {
    'general': []
};
let unreadCounts = {
    'general': 0
};
let msgSearchQuery = '';
const drawerMediaOpen = { images: false, files: false, links: false };
const drawerMediaExpanded = { images: false, files: false, links: false };
const seenMessageIds = new Set();
const restoredFileUrls = {}; // fileId -> objectUrl
const indexedDbFileMeta = {}; // fileId -> { size, chatId, name, timestamp }

// --- WebRTC State ---
const peerConnections = {}; // targetId -> RTCPeerConnection (DataChannel)
const dataChannels = {};    // targetId -> RTCDataChannel
let rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
    ]
};

async function loadIceConfig() {
    try {
        const res = await fetch('/api/ice-config', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
            rtcConfig = { iceServers: data.iceServers };
        }
    } catch (e) {
        // Dùng cấu hình STUN mặc định nếu không lấy được từ API
    }
}
loadIceConfig();

// Call State
let currentCall = null; // { targetId, isVideo, pc, localStream, timerInterval, startTime, isMuted, isCamOff }
let pendingIncomingCall = null;
let ringtoneAudioCtx = null;
let ringtoneInterval = null;

// =========================================================
// INDEXEDDB FILE STORAGE (Lưu file vĩnh viễn không mất khi F5)
// =========================================================
const DB_NAME = 'LocalChatFilesDB';
const DB_VERSION = 1;
let dbInstance = null;

function initIndexedDB() {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            console.warn('Trình duyệt không hỗ trợ IndexedDB.');
            return resolve(null);
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => {
            dbInstance = e.target.result;
            resolve(dbInstance);
        };
        request.onerror = () => {
            console.warn('Không thể mở IndexedDB.');
            resolve(null);
        };
    });
}

function findChatIdForFileId(fileId) {
    if (!fileId) return '';
    const keys = Object.keys(chatHistory);
    for (let i = 0; i < keys.length; i++) {
        const cid = keys[i];
        if ((chatHistory[cid] || []).some(m => m && m.id === fileId)) {
            return cid;
        }
    }
    return '';
}

function revokeObjectUrlsForIds(ids) {
    (ids || []).forEach(id => {
        if (restoredFileUrls[id]) {
            try {
                URL.revokeObjectURL(restoredFileUrls[id]);
            } catch (e) {}
            delete restoredFileUrls[id];
        }
    });
}

async function saveFileToIndexedDB(fileId, name, size, blob, timestamp, chatId = '') {
    if (!fileId || !blob) return;
    const effectiveSize = size || blob.size || 0;
    const effectiveChatId = chatId || findChatIdForFileId(fileId) || currentActiveChat || 'general';
    if (!appSettings.saveMedia) return;

    indexedDbFileMeta[fileId] = {
        size: effectiveSize,
        chatId: effectiveChatId,
        name: name || '',
        timestamp: timestamp || ''
    };
    if (!dbInstance) return;
    try {
        const tx = dbInstance.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        store.put({
            id: fileId,
            name: name,
            size: effectiveSize,
            blob: blob,
            timestamp: timestamp,
            chatId: effectiveChatId
        });
    } catch (e) {
        console.warn('Lỗi lưu file vào IndexedDB:', e);
    }
}

async function restoreFilesFromIndexedDB() {
    if (!dbInstance) return;
    try {
        const tx = dbInstance.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const request = store.getAll();
        request.onsuccess = () => {
            const records = request.result || [];
            records.forEach(rec => {
                if (rec.id) {
                    indexedDbFileMeta[rec.id] = {
                        size: rec.size || (rec.blob ? rec.blob.size : 0),
                        chatId: rec.chatId || findChatIdForFileId(rec.id) || '',
                        name: rec.name || '',
                        timestamp: rec.timestamp || ''
                    };
                }
                if (rec.id && rec.blob && !restoredFileUrls[rec.id]) {
                    try {
                        const url = URL.createObjectURL(rec.blob);
                        restoredFileUrls[rec.id] = url;
                    } catch (e) {
                        // Bỏ qua nếu blob bị hỏng
                    }
                }
            });
            renderChatHistory();
            if (typeof renderChatInfoDrawer === 'function' && appContainer.classList.contains('show-info')) {
                renderChatInfoDrawer();
            }
            if (typeof renderStorageModal === 'function' && storageModal && storageModal.classList.contains('active')) {
                renderStorageModal();
            }
        };
    } catch (e) {
        console.warn('Lỗi đọc IndexedDB:', e);
    }
}

function deleteIndexedDbFilesByIds(fileIds) {
    const uniqueIds = Array.from(new Set((fileIds || []).filter(Boolean)));
    revokeObjectUrlsForIds(uniqueIds);
    uniqueIds.forEach(id => {
        delete indexedDbFileMeta[id];
    });
    if (!dbInstance || uniqueIds.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
        try {
            const tx = dbInstance.transaction('files', 'readwrite');
            const store = tx.objectStore('files');
            uniqueIds.forEach(id => store.delete(id));
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch (e) {
            resolve();
        }
    });
}

function clearAllIndexedDbFiles() {
    const allIds = Array.from(new Set([
        ...Object.keys(restoredFileUrls),
        ...Object.keys(indexedDbFileMeta)
    ]));
    revokeObjectUrlsForIds(allIds);
    Object.keys(indexedDbFileMeta).forEach(k => delete indexedDbFileMeta[k]);
    if (!dbInstance) return Promise.resolve();
    return new Promise((resolve) => {
        try {
            const tx = dbInstance.transaction('files', 'readwrite');
            const store = tx.objectStore('files');
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch (e) {
            resolve();
        }
    });
}

function getChatFileIds(chatId) {
    const ids = new Set();
    (chatHistory[chatId] || []).forEach(m => {
        if (m && m.isFile && m.id && (indexedDbFileMeta[m.id] || restoredFileUrls[m.id])) {
            ids.add(m.id);
        }
    });
    Object.entries(indexedDbFileMeta).forEach(([fileId, meta]) => {
        if (meta && meta.chatId === chatId) {
            ids.add(fileId);
        }
    });
    return Array.from(ids);
}

function getChatStorageStats(chatId) {
    const history = chatHistory[chatId] || [];
    const fileIds = getChatFileIds(chatId);
    let totalBytes = 0;
    const msgSizeById = {};
    history.forEach(m => {
        if (m && m.id && m.fileSize) msgSizeById[m.id] = m.fileSize;
    });
    fileIds.forEach(id => {
        const meta = indexedDbFileMeta[id];
        totalBytes += (meta && meta.size) || msgSizeById[id] || 0;
    });
    return {
        messageCount: history.length,
        fileCount: fileIds.length,
        fileBytes: totalBytes,
        fileIds: fileIds
    };
}

// Khởi tạo IndexedDB ngay khi tải trang
initIndexedDB().then(() => {
    restoreFilesFromIndexedDB();
});

// =========================================================
// UTILITIES
// =========================================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMessageText(text) {
    const escaped = escapeHtml(text);
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    return escaped.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isImageFile(fileName) {
    return /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(fileName || '');
}

function isVideoFile(fileName) {
    return /\.(mp4|webm|mov|m4v|ogv)$/i.test(fileName || '');
}

function extractUrlsFromText(text) {
    if (!text || typeof text !== 'string') return [];
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    const matches = text.match(urlRegex) || [];
    return matches.filter(u => /^https?:\/\//i.test(u));
}

function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

// Notification chime via Web Audio API
function playNotificationSound() {
    if (!appSettings.soundEnabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
}

// Ringtone generator
function startRingtone() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        ringtoneAudioCtx = new AudioCtx();
        if (ringtoneAudioCtx.state === 'suspended') {
            ringtoneAudioCtx.resume();
        }

        const playBeep = () => {
            if (!ringtoneAudioCtx) return;
            const now = ringtoneAudioCtx.currentTime;
            const osc = ringtoneAudioCtx.createOscillator();
            const gain = ringtoneAudioCtx.createGain();
            osc.connect(gain);
            gain.connect(ringtoneAudioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(480, now + 0.2);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc.start(now);
            osc.stop(now + 1.2);
        };

        playBeep();
        ringtoneInterval = setInterval(playBeep, 3000);
    } catch (e) {
        console.warn('Lỗi phát chuông:', e);
    }
}

function stopRingtone() {
    if (ringtoneInterval) {
        clearInterval(ringtoneInterval);
        ringtoneInterval = null;
    }
    if (ringtoneAudioCtx) {
        try {
            ringtoneAudioCtx.close();
        } catch (e) {}
        ringtoneAudioCtx = null;
    }
}

function updateTabTitle() {
    let totalUnread = 0;
    Object.values(unreadCounts).forEach(cnt => { totalUnread += cnt; });
    if (totalUnread > 0) {
        document.title = `(${totalUnread}) Chat Nội Bộ Wi-Fi`;
    } else {
        document.title = 'Chat Nội Bộ Wi-Fi';
    }
}

// =========================================================
// KIỂM TRA QUYỀN SỞ HỮU TIN NHẮN (Khắc phục lỗi nhảy vị trí khi F5)
// =========================================================
function isMessageMine(msg) {
    if (!msg) return false;
    // 1. Kiểm tra tuyệt đối theo senderDeviceId (cố định trên thiết bị)
    if (msg.senderDeviceId) {
        return msg.senderDeviceId === myDeviceId;
    }
    // 2. Thuộc tính isMine đã lưu rõ ràng
    if (typeof msg.isMine === 'boolean') {
        return msg.isMine;
    }
    // 3. Fallback theo socket.id
    if (myInfo && msg.from && msg.from.id) {
        return msg.from.id === myInfo.id;
    }
    return false;
}

// =========================================================
// LOCALSTORAGE PERSISTENCE (Lịch sử chat)
// =========================================================
function applyHistoryLimit(arr) {
    const list = Array.isArray(arr) ? arr : [];
    const limit = Number(appSettings.historyLimit);
    if (Number.isFinite(limit) && limit > 0) {
        return list.slice(-limit);
    }
    return list;
}

function loadPersistedHistory() {
    try {
        const saved = localStorage.getItem('localchat_history_v1');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                Object.keys(parsed).forEach(k => {
                    if (Array.isArray(parsed[k])) {
                        chatHistory[k] = applyHistoryLimit(parsed[k]).map(m => ({
                            ...m,
                            isMine: isMessageMine(m)
                        }));
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Không thể đọc lịch sử tin nhắn từ localStorage:', e);
    }
}

function savePersistedHistory() {
    try {
        const toSave = {};
        Object.keys(chatHistory).forEach(k => {
            toSave[k] = applyHistoryLimit(chatHistory[k] || []).map(m => {
                const mine = isMessageMine(m);
                return {
                    id: m.id,
                    senderDeviceId: m.senderDeviceId || (mine ? myDeviceId : 'other'),
                    isMine: mine,
                    from: m.from,
                    to: m.to,
                    content: m.content,
                    isFile: m.isFile,
                    fileName: m.fileName,
                    fileSize: m.fileSize,
                    mimeType: m.mimeType,
                    relayFileUrl: m.relayFileUrl,
                    timestamp: m.timestamp
                };
            });
        });
        localStorage.setItem('localchat_history_v1', JSON.stringify(toSave));
    } catch (e) {
        console.warn('Không thể lưu lịch sử tin nhắn vào localStorage:', e);
    }
}

loadPersistedHistory();

// =========================================================
// SOCKET EVENTS, ROOM MANAGEMENT & MOBILE RECONNECT
// =========================================================
function updateConnectionStatus(isOnline) {
    if (connectionStatus) {
        connectionStatus.className = isOnline ? 'connection-status online' : 'connection-status offline';
    }
    if (statusText) {
        statusText.textContent = isOnline ? 'Trực tuyến' : 'Mất kết nối';
    }
}

function updateRoomBanner(info) {
    if (!info || !roomBanner) return;
    const isCustom = info.roomMode === 'custom' && info.roomCode;
    roomBanner.classList.toggle('custom-mode', !!isCustom);
    if (roomBannerIcon) {
        roomBannerIcon.className = isCustom ? 'ph-fill ph-lock-key' : 'ph-fill ph-broadcast';
    }
    if (roomModeLabel) {
        roomModeLabel.textContent = isCustom ? 'Phòng riêng (mọi tầng mạng)' : 'Tự động theo mạng';
    }
    if (roomIdLabel) {
        roomIdLabel.textContent = info.roomDisplayName || info.roomId || 'Đang dò mạng...';
    }
}

function syncRoomUrl(code) {
    try {
        const url = new URL(window.location.href);
        if (code) {
            url.searchParams.set('room', code);
            localStorage.setItem('localchat_room_code', code);
        } else {
            url.searchParams.delete('room');
            localStorage.removeItem('localchat_room_code');
        }
        window.history.replaceState({}, '', url.toString());
    } catch (e) {}
}

function buildRoomInviteUrl(code) {
    const url = new URL(window.location.origin + window.location.pathname);
    if (code) {
        url.searchParams.set('room', code);
    }
    return url.toString();
}

function renderRoomModalUI() {
    const activeCode = (myInfo && myInfo.roomMode === 'custom' && myInfo.roomCode) || currentRoomCode;
    if (activeCode) {
        roomShareCard.style.display = 'block';
        currentRoomCodeDisplay.textContent = activeCode;
        const inviteUrl = buildRoomInviteUrl(activeCode);
        if (typeof window.qrcode === 'function') {
            try {
                const qr = window.qrcode(0, 'M');
                qr.addData(inviteUrl);
                qr.make();
                roomQrWrap.innerHTML = qr.createSvgTag({ scalable: true });
            } catch (e) {
                roomQrWrap.innerHTML = '';
            }
        } else {
            roomQrWrap.innerHTML = '';
        }
    } else {
        roomShareCard.style.display = 'none';
        roomQrWrap.innerHTML = '';
    }
}

function cleanupPeerConnections() {
    Object.keys(peerConnections).forEach(id => {
        try { peerConnections[id].close(); } catch (e) {}
        delete peerConnections[id];
    });
    Object.keys(dataChannels).forEach(id => {
        try { dataChannels[id].close(); } catch (e) {}
        delete dataChannels[id];
    });
    Object.keys(receivingFiles).forEach(id => {
        delete receivingFiles[id];
    });
}

function switchRoom(nextCode) {
    const normalized = normalizeRoomCode(nextCode || '');
    const roomChanged = normalized !== currentRoomCode;
    currentRoomCode = normalized;
    syncRoomUrl(currentRoomCode);
    socket.auth = buildSocketAuth();

    if (currentCall) {
        endCurrentCall();
    }
    cleanupPeerConnections();

    if (roomChanged) {
        currentActiveChat = 'general';
        pinnedMessages.general = null;
        savePersistedPins();
        if (typeof closeChatInfoDrawer === 'function') {
            closeChatInfoDrawer();
        }
        if (appContainer) {
            appContainer.classList.remove('show-chat');
        }
    }

    socket.emit('switch_room', { roomCode: currentRoomCode }, (res) => {
        if (res && res.ok) {
            renderRoomModalUI();
        }
    });
}

// Kiểm tra ngay khi khởi động
if (socket.connected) {
    updateConnectionStatus(true);
}

socket.on('connect', () => {
    socket.auth = buildSocketAuth();
    updateConnectionStatus(true);
});

socket.on('disconnect', () => {
    updateConnectionStatus(false);
    currentChatSubtitle.textContent = 'Mất kết nối';
    if (currentCall) {
        endCurrentCall();
    }
});

// Tự động kết nối lại ngay khi quay lại tab trên iPhone / Android hoặc khi có mạng trở lại
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !socket.connected) {
        socket.auth = buildSocketAuth();
        socket.connect();
    }
});

window.addEventListener('online', () => {
    if (!socket.connected) {
        socket.auth = buildSocketAuth();
        socket.connect();
    }
});

let receivedServerPinUpdate = false;
let currentSyncedRoomId = '';

function sanitizePinTextClient(rawText) {
    if (typeof rawText !== 'string') return '';
    return rawText.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}

function getEffectivePin(chatId) {
    if (chatId === 'general') {
        const gen = pinnedMessages.general;
        if (!gen) {
            return { text: DEFAULT_GENERAL_PIN, isDefault: true, isCleared: false, updatedBy: '' };
        }
        if (gen.isCleared || !gen.text) {
            return { text: '', isDefault: false, isCleared: true, updatedBy: gen.updatedBy || '' };
        }
        return { text: gen.text, isDefault: false, isCleared: false, updatedBy: gen.updatedBy || '' };
    }
    const peerPin = pinnedMessages.peers && pinnedMessages.peers[chatId];
    if (!peerPin || peerPin.isCleared || !peerPin.text) {
        return { text: '', isDefault: false, isCleared: true, updatedBy: '' };
    }
    return { text: peerPin.text, isDefault: false, isCleared: false, updatedBy: peerPin.updatedBy || '' };
}

function renderPinnedBanner() {
    if (!pinnedMessageContainer || !pinnedText) return;
    const pin = getEffectivePin(currentActiveChat);
    if (pin.isCleared || !pin.text) {
        pinnedMessageContainer.style.display = 'none';
        pinnedText.textContent = '';
        return;
    }
    pinnedMessageContainer.style.display = 'flex';
    pinnedText.textContent = (pin.updatedBy && !pin.isDefault) ? `${pin.updatedBy}: ${pin.text}` : pin.text;
}

function applyPinnedMessage(chatScope, rawText, options = {}) {
    const { resetDefault = false, updatedBy = '', forceSyncInput = true } = options;
    const scope = chatScope || 'general';
    const text = sanitizePinTextClient(rawText);

    if (scope === 'general') {
        if (resetDefault) {
            pinnedMessages.general = null;
        } else if (!text) {
            pinnedMessages.general = { roomId: (myInfo && myInfo.roomId) || '', text: '', isCleared: true, updatedBy };
        } else {
            pinnedMessages.general = { roomId: (myInfo && myInfo.roomId) || '', text, isCleared: false, updatedBy };
        }
    } else {
        if (!pinnedMessages.peers || typeof pinnedMessages.peers !== 'object') {
            pinnedMessages.peers = {};
        }
        if (resetDefault || !text) {
            delete pinnedMessages.peers[scope];
        } else {
            pinnedMessages.peers[scope] = { text, isCleared: false, updatedBy };
        }
    }

    savePersistedPins();
    if (scope === currentActiveChat) {
        renderPinnedBanner();
        if (forceSyncInput && drawerPinInput && document.activeElement !== drawerPinInput) {
            const effective = getEffectivePin(currentActiveChat);
            drawerPinInput.value = effective.isCleared ? '' : effective.text;
        }
        renderDrawerPinSection(true);
    }
}

function submitPinnedMessage(chatScope, rawText, options = {}) {
    const { resetDefault = false } = options;
    const cleaned = resetDefault ? '' : sanitizePinTextClient(rawText);
    applyPinnedMessage(chatScope, cleaned, {
        resetDefault,
        updatedBy: (myInfo && myInfo.name) || 'Bạn',
        forceSyncInput: true
    });
    if (chatScope === currentActiveChat && drawerPinInput) {
        const effective = getEffectivePin(currentActiveChat);
        drawerPinInput.value = effective.isCleared ? '' : effective.text;
    }
    if (socket.connected) {
        socket.emit('update_pinned_message', {
            chatScope,
            text: cleaned,
            resetDefault
        });
    }
}

socket.on('pinned_message_update', (payload) => {
    if (!payload) return;
    receivedServerPinUpdate = true;
    const scope = payload.chatScope || 'general';
    applyPinnedMessage(scope, payload.text || '', {
        resetDefault: Boolean(payload.resetDefault),
        updatedBy: payload.updatedBy || '',
        forceSyncInput: true
    });
});

socket.on('your info', (info) => {
    updateConnectionStatus(true);
    const prevRoomId = currentSyncedRoomId;
    myInfo = info;
    currentSyncedRoomId = info.roomId || '';
    if (
        (prevRoomId && prevRoomId !== currentSyncedRoomId) ||
        (!receivedServerPinUpdate && pinnedMessages.general && pinnedMessages.general.roomId && pinnedMessages.general.roomId !== currentSyncedRoomId)
    ) {
        pinnedMessages.general = null;
        savePersistedPins();
    }
    myDisplayName.textContent = info.name;
    myIpLabel.textContent = info.ip ? `IP: ${info.ip}` : '';

    if (info.roomMode === 'custom' && info.roomCode) {
        currentRoomCode = info.roomCode;
    } else {
        currentRoomCode = '';
    }
    syncRoomUrl(currentRoomCode);
    updateRoomBanner(info);
    if (roomModal && roomModal.classList.contains('active')) {
        renderRoomModalUI();
    }

    const savedName = localStorage.getItem('localchat_display_name');
    if (savedName && savedName !== info.name) {
        socket.emit('change name', savedName);
    }

    // Cập nhật lại giao diện sau khi nhận info
    updateSidebar();
    updateChatHeader();
    renderChatHistory();
});

socket.on('user list', (userList) => {
    users = userList;

    // Dọn kết nối P2P của thiết bị đã rời phòng để tái thiết lập sạch nếu kết nối lại
    const activeIds = new Set(users.map(u => u.id));
    Object.keys(peerConnections).forEach(pid => {
        if (!activeIds.has(pid)) {
            try { peerConnections[pid].close(); } catch (e) {}
            delete peerConnections[pid];
            delete dataChannels[pid];
        }
    });

    updateSidebar();
    updateChatHeader();

    // Kết nối DataChannel P2P
    if (myInfo) {
        users.forEach(user => {
            if (user.id !== myInfo.id && !peerConnections[user.id]) {
                if (myInfo.id > user.id) {
                    createPeerConnection(user.id, true);
                } else {
                    createPeerConnection(user.id, false);
                }
            }
        });
    }
});

// Fallback message relay từ server
socket.on('relay_message', (data) => {
    if (!data) return;
    handleIncomingMessage(data);
});

// WebRTC Signaling cho DataChannel
socket.on('webrtc_offer', async (data) => {
    const pc = peerConnections[data.sender] || createPeerConnection(data.sender, false);
    if (pc) {
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc_answer', { target: data.sender, answer: answer });
        } catch (e) {
            console.error('Lỗi webrtc_offer:', e);
        }
    }
});

socket.on('webrtc_answer', async (data) => {
    const pc = peerConnections[data.sender];
    if (pc) {
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
            console.error('Lỗi webrtc_answer:', e);
        }
    }
});

socket.on('webrtc_ice_candidate', async (data) => {
    const pc = peerConnections[data.sender];
    if (pc && data.candidate) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
            console.error('Lỗi ICE candidate:', e);
        }
    }
});

// =========================================================
// WEBRTC DATA CHANNEL SETUP (Chat & Truyền file P2P)
// =========================================================
function createPeerConnection(targetId, isInitiator) {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections[targetId] = pc;

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('webrtc_ice_candidate', {
                target: targetId,
                candidate: event.candidate
            });
        }
    };

    pc.onconnectionstatechange = () => {
        updateChatHeader();
    };

    if (isInitiator) {
        const dc = pc.createDataChannel('chat');
        setupDataChannel(dc, targetId);

        pc.createOffer().then(offer => {
            return pc.setLocalDescription(offer);
        }).then(() => {
            socket.emit('webrtc_offer', {
                target: targetId,
                offer: pc.localDescription
            });
        }).catch(e => console.error("Lỗi tạo offer:", e));
    } else {
        pc.ondatachannel = (event) => {
            setupDataChannel(event.channel, targetId);
        };
    }

    return pc;
}

const receivingFiles = {};

function setupDataChannel(dc, targetId) {
    dataChannels[targetId] = dc;
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => updateChatHeader();
    dc.onclose = () => {
        delete dataChannels[targetId];
        delete peerConnections[targetId];
        updateChatHeader();
    };

    dc.onmessage = async (event) => {
        const senderInfo = users.find(u => u.id === targetId);
        if (!senderInfo) return;

        if (typeof event.data === 'string') {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'text') {
                    handleIncomingMessage({
                        id: data.id,
                        senderDeviceId: data.senderDeviceId,
                        from: senderInfo,
                        to: data.to,
                        content: data.content,
                        isFile: false,
                        timestamp: data.timestamp,
                        isMine: false
                    });
                }
                else if (data.type === 'file-start') {
                    receivingFiles[targetId] = {
                        id: data.id || generateId(),
                        senderDeviceId: data.senderDeviceId,
                        name: data.fileName,
                        size: data.size,
                        chunks: [],
                        received: 0,
                        to: data.to,
                        timestamp: data.timestamp
                    };
                    showTransferProgress(`Đang nhận: ${data.fileName}`, 0);
                }
                else if (data.type === 'file-end') {
                    const fileData = receivingFiles[targetId];
                    if (fileData) {
                        try {
                            const blob = new Blob(fileData.chunks);
                            const fileUrl = URL.createObjectURL(blob);
                            const chatScope = fileData.to === 'general' ? 'general' : senderInfo.id;

                            saveFileToIndexedDB(fileData.id, fileData.name, fileData.size, blob, fileData.timestamp, chatScope);
                            restoredFileUrls[fileData.id] = fileUrl;

                            handleIncomingMessage({
                                id: fileData.id,
                                senderDeviceId: fileData.senderDeviceId,
                                from: senderInfo,
                                to: fileData.to,
                                content: '',
                                isFile: true,
                                fileName: fileData.name,
                                fileSize: fileData.size,
                                fileUrl: fileUrl,
                                timestamp: fileData.timestamp,
                                isMine: false
                            });
                            showTransferProgress(`Đã nhận: ${fileData.name}`, 100);
                            setTimeout(hideTransferProgress, 1800);
                        } catch (e) {
                            console.error("Lỗi ghép file nhị phân:", e);
                            hideTransferProgress();
                        } finally {
                            delete receivingFiles[targetId];
                        }
                    }
                }
            } catch (err) {
                console.error("Lỗi parse gói WebRTC:", err);
            }
        }
        else if (event.data instanceof ArrayBuffer) {
            const fileData = receivingFiles[targetId];
            if (fileData) {
                fileData.chunks.push(event.data);
                fileData.received += event.data.byteLength;
                if (fileData.size > 0) {
                    const pct = Math.min(100, Math.round((fileData.received / fileData.size) * 100));
                    showTransferProgress(`Đang nhận: ${fileData.name}`, pct, `${formatFileSize(fileData.received)} / ${formatFileSize(fileData.size)}`);
                }
            }
        }
    };
}

const fetchingRelayIds = new Set();
const MAX_AUTO_CACHE_RELAY_BYTES = 20 * 1024 * 1024; // Tự tải lưu IndexedDB với tệp <= 20MB

async function cacheRelayFileToIndexedDB(msg) {
    if (!msg || !msg.id || !msg.relayFileUrl) return;
    if (restoredFileUrls[msg.id] || fetchingRelayIds.has(msg.id)) return;
    if (msg.fileSize && msg.fileSize > MAX_AUTO_CACHE_RELAY_BYTES) return;

    fetchingRelayIds.add(msg.id);
    try {
        const res = await fetch(msg.relayFileUrl, { cache: 'no-store' });
        if (!res.ok) return;
        const rawBlob = await res.blob();
        const blob = msg.mimeType ? new Blob([rawBlob], { type: msg.mimeType }) : rawBlob;
        const objectUrl = URL.createObjectURL(blob);
        restoredFileUrls[msg.id] = objectUrl;
        const targetChat = msg.to === 'general' ? 'general' : (msg.from && msg.from.id);
        saveFileToIndexedDB(msg.id, msg.fileName, msg.fileSize || blob.size, blob, msg.timestamp, targetChat);

        if (currentActiveChat === targetChat) {
            renderChatHistory();
        }
        if (typeof renderChatInfoDrawer === 'function' && appContainer.classList.contains('show-info') && currentActiveChat === targetChat) {
            renderChatInfoDrawer();
        }
        if (typeof renderStorageModal === 'function' && storageModal && storageModal.classList.contains('active')) {
            renderStorageModal();
        }
    } catch (e) {
        console.warn('Không thể tải trước tệp từ Relay:', e);
    } finally {
        fetchingRelayIds.delete(msg.id);
    }
}

function handleIncomingMessage(msg) {
    if (!msg) return;

    // Chống nhận trùng lặp tin nhắn
    if (msg.id) {
        if (seenMessageIds.has(msg.id)) return;
        seenMessageIds.add(msg.id);
        if (seenMessageIds.size > 500) {
            const first = seenMessageIds.values().next().value;
            seenMessageIds.delete(first);
        }
    }

    // Không nhận lại tin nhắn do chính thiết bị này gửi đi
    if (msg.senderDeviceId && msg.senderDeviceId === myDeviceId) {
        return;
    }
    if (myInfo && msg.from && msg.from.id === myInfo.id) {
        return;
    }

    // Tin nhắn đến từ người khác LUÔN LUÔN là false (bên trái)
    msg.isMine = false;

    const targetChat = msg.to === 'general' ? 'general' : msg.from.id;

    if (!chatHistory[targetChat]) {
        chatHistory[targetChat] = [];
    }
    chatHistory[targetChat].push(msg);
    savePersistedHistory();

    if (msg.isFile && msg.relayFileUrl) {
        cacheRelayFileToIndexedDB(msg);
    }

    if (currentActiveChat === targetChat) {
        renderMessage(msg);
        scrollToBottom();
        if (typeof renderChatInfoDrawer === 'function' && appContainer.classList.contains('show-info')) {
            renderChatInfoDrawer();
        }
    } else {
        unreadCounts[targetChat] = (unreadCounts[targetChat] || 0) + 1;
        playNotificationSound();
        updateTabTitle();
    }

    if (typeof renderStorageModal === 'function' && storageModal && storageModal.classList.contains('active')) {
        renderStorageModal();
    }
    updateSidebar();
}

function sendViaWebRTC(payload) {
    const payloadStr = JSON.stringify(payload);
    let sentCount = 0;

    if (payload.to === 'general') {
        Object.entries(dataChannels).forEach(([targetId, dc]) => {
            if (dc && dc.readyState === 'open') {
                try {
                    dc.send(payloadStr);
                    sentCount++;
                } catch (e) {
                    console.warn(`Không thể gửi tới ${targetId}:`, e);
                }
            }
        });

        const otherUsersCount = users.filter(u => u.id !== myInfo?.id).length;
        if (sentCount < otherUsersCount || sentCount === 0) {
            socket.emit('relay_message', payload);
        }
    } else {
        const dc = dataChannels[payload.to];
        if (dc && dc.readyState === 'open') {
            try {
                dc.send(payloadStr);
            } catch (e) {
                socket.emit('relay_message', payload);
            }
        } else {
            socket.emit('relay_message', payload);
        }
    }
}

function sendBinaryViaWebRTC(arrayBuffer, toChat) {
    if (toChat === 'general') {
        Object.values(dataChannels).forEach(dc => {
            if (dc.readyState === 'open') {
                dc.send(arrayBuffer);
            }
        });
    } else {
        const dc = dataChannels[toChat];
        if (dc && dc.readyState === 'open') {
            dc.send(arrayBuffer);
        }
    }
}

async function waitWebRTCBuffer(toChat) {
    const MAX_BUFFER = 1024 * 1024;
    let isFull = true;

    while (isFull) {
        isFull = false;
        if (toChat === 'general') {
            Object.values(dataChannels).forEach(dc => {
                if (dc.readyState === 'open' && dc.bufferedAmount > MAX_BUFFER) {
                    isFull = true;
                }
            });
        } else {
            const dc = dataChannels[toChat];
            if (dc && dc.readyState === 'open' && dc.bufferedAmount > MAX_BUFFER) {
                isFull = true;
            }
        }

        if (isFull) {
            await new Promise(r => setTimeout(r, 10));
        }
    }
}

function showTransferProgress(title, percent, details = '') {
    transferProgressCard.style.display = 'flex';
    transferFilename.textContent = title;
    transferStats.textContent = details ? `${percent}% (${details})` : `${percent}%`;
    progressBarFill.style.width = `${percent}%`;
}

function hideTransferProgress() {
    transferProgressCard.style.display = 'none';
    progressBarFill.style.width = '0%';
}

function appendSentFileMessage(file, fileId, toChat, timestamp, relayFileUrl = '') {
    const fileUrl = URL.createObjectURL(file);
    saveFileToIndexedDB(fileId, file.name, file.size, file, timestamp);
    restoredFileUrls[fileId] = fileUrl;

    const msg = {
        id: fileId,
        senderDeviceId: myDeviceId,
        from: myInfo,
        to: toChat,
        content: '',
        isFile: true,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: fileUrl,
        relayFileUrl: relayFileUrl || undefined,
        timestamp: timestamp,
        isMine: true
    };

    if (!chatHistory[toChat]) chatHistory[toChat] = [];
    chatHistory[toChat].push(msg);
    savePersistedHistory();

    if (currentActiveChat === toChat) {
        renderMessage(msg);
        scrollToBottom();
    }
    updateSidebar();
}

function canSendFileDirectlyViaP2P(toChat) {
    if (toChat === 'general') {
        const otherUsers = users.filter(u => myInfo && u.id !== myInfo.id);
        if (otherUsers.length === 0) return true; // Chỉ lưu cục bộ nếu chưa có ai khác
        return otherUsers.every(u => dataChannels[u.id] && dataChannels[u.id].readyState === 'open');
    }
    return !!(dataChannels[toChat] && dataChannels[toChat].readyState === 'open');
}

async function sendFileViaServerRelay(file, toChat) {
    if (!socket.connected || !myInfo || !myInfo.roomId) {
        alert('Chưa kết nối tới máy chủ để truyền tập tin. Vui lòng thử lại.');
        return;
    }

    const timestamp = new Date().toISOString();
    const fileId = generateId();
    const transferId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
    const CHUNK_SIZE = 1536 * 1024; // 1.5MB mỗi mảnh (an toàn dưới ngưỡng 100MB Cloudflare)
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

    seenMessageIds.add(fileId);
    showTransferProgress(`Đang gửi (Relay): ${file.name}`, 0);

    try {
        let lastResult = null;
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(file.size, start + CHUNK_SIZE);
            const slice = file.slice(start, end);

            const formData = new FormData();
            formData.append('transferId', transferId);
            formData.append('chunkIndex', String(chunkIndex));
            formData.append('totalChunks', String(totalChunks));
            formData.append('fileName', file.name);
            formData.append('fileSize', String(file.size));
            formData.append('mimeType', file.type || 'application/octet-stream');
            formData.append('roomId', myInfo.roomId);
            formData.append('senderId', myInfo.id);
            formData.append('targetId', toChat);
            formData.append('messageId', fileId);
            formData.append('timestamp', timestamp);
            formData.append('chunk', slice, 'chunk.bin');

            const response = await fetch('/api/relay/upload-chunk', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload chunk thất bại (${response.status})`);
            }
            lastResult = await response.json();
            if (!lastResult || !lastResult.ok) {
                throw new Error((lastResult && lastResult.error) || 'Lỗi upload chunk');
            }

            const pct = Math.min(100, Math.round(((chunkIndex + 1) / totalChunks) * 100));
            showTransferProgress(
                `Đang gửi (Relay): ${file.name}`,
                pct,
                `${formatFileSize(end)} / ${formatFileSize(file.size)}`
            );
        }

        showTransferProgress(`Đã gửi: ${file.name}`, 100);
        setTimeout(hideTransferProgress, 1800);
        appendSentFileMessage(file, fileId, toChat, timestamp, lastResult && lastResult.fileUrl);
    } catch (e) {
        console.error('Lỗi gửi file qua Relay:', e);
        alert('Không thể truyền tập tin qua máy chủ. Vui lòng kiểm tra kết nối mạng.');
        hideTransferProgress();
    }
}

async function sendFile(file, toChat) {
    if (!file) return;

    // Nếu WebRTC DataChannel bị chặn (AP Isolation / tường lửa trường), tự động chuyển sang Relay qua Server
    if (!canSendFileDirectlyViaP2P(toChat)) {
        await sendFileViaServerRelay(file, toChat);
        return;
    }

    const timestamp = new Date().toISOString();
    const fileId = generateId();
    seenMessageIds.add(fileId);

    showTransferProgress(`Đang gửi: ${file.name}`, 0);

    sendViaWebRTC({
        id: fileId,
        senderDeviceId: myDeviceId,
        type: 'file-start',
        fileName: file.name,
        size: file.size,
        to: toChat,
        timestamp: timestamp
    });

    const chunkSize = 65536;
    let offset = 0;

    try {
        while (offset < file.size) {
            await waitWebRTCBuffer(toChat);
            const slice = file.slice(offset, offset + chunkSize);
            const arrayBuffer = await slice.arrayBuffer();

            sendBinaryViaWebRTC(arrayBuffer, toChat);

            offset += chunkSize;
            const pct = Math.min(100, Math.round((offset / file.size) * 100));
            showTransferProgress(`Đang gửi: ${file.name}`, pct, `${formatFileSize(offset)} / ${formatFileSize(file.size)}`);
        }

        sendViaWebRTC({
            type: 'file-end',
            to: toChat
        });

        showTransferProgress(`Đã gửi: ${file.name}`, 100);
        setTimeout(hideTransferProgress, 1800);
        appendSentFileMessage(file, fileId, toChat, timestamp);
    } catch (e) {
        console.error('Lỗi gửi file P2P, chuyển sang Relay:', e);
        hideTransferProgress();
        await sendFileViaServerRelay(file, toChat);
    }
}

// =========================================================
// WEBRTC VOICE & VIDEO CALL P2P (Gọi thoại và gọi video)
// =========================================================
function updateCallUIButtons() {
    if (currentActiveChat === 'general') {
        voiceCallBtn.style.display = 'none';
        videoCallBtn.style.display = 'none';
    } else {
        voiceCallBtn.style.display = 'flex';
        videoCallBtn.style.display = 'flex';
    }
}

async function startCall(isVideo) {
    if (currentActiveChat === 'general') return;
    const targetUser = users.find(u => u.id === currentActiveChat);
    if (!targetUser) {
        alert('Người dùng này không còn trực tuyến.');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
        });

        currentCall = {
            targetId: currentActiveChat,
            isVideo: isVideo,
            isCaller: true,
            localStream: stream,
            pc: null,
            timerInterval: null,
            startTime: null,
            isMuted: false,
            isCamOff: !isVideo
        };

        localVideo.srcObject = stream;
        localVideo.style.display = isVideo ? 'block' : 'none';
        remoteVideo.style.display = 'none';
        remoteAvatarFallback.style.display = 'flex';
        callPeerName.textContent = targetUser.name;
        callStatusSub.textContent = `Đang đổ chuông tới ${targetUser.name}...`;
        callTimer.textContent = 'Đang gọi...';

        activeCallModal.style.display = 'flex';
        startRingtone();

        socket.emit('call_user', {
            target: currentActiveChat,
            isVideo: isVideo
        });
    } catch (err) {
        console.error('Không thể truy cập Microphone/Camera:', err);
        alert('Không thể truy cập Microphone hoặc Camera của thiết bị.');
    }
}

socket.on('call_incoming', (data) => {
    if (currentCall) {
        socket.emit('call_rejected', { target: data.caller.id });
        return;
    }

    pendingIncomingCall = data;
    callerNameElem.textContent = data.caller.name || 'Người dùng';
    callTypeLabelElem.textContent = data.isVideo ? 'Cuộc gọi video P2P...' : 'Cuộc gọi thoại P2P...';

    incomingCallModal.classList.add('active');
    startRingtone();
});

acceptCallBtn.addEventListener('click', async () => {
    if (!pendingIncomingCall) return;
    stopRingtone();
    incomingCallModal.classList.remove('active');

    const data = pendingIncomingCall;
    pendingIncomingCall = null;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: data.isVideo ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
        });

        currentCall = {
            targetId: data.caller.id,
            isVideo: data.isVideo,
            isCaller: false,
            localStream: stream,
            pc: null,
            timerInterval: null,
            startTime: null,
            isMuted: false,
            isCamOff: !data.isVideo
        };

        localVideo.srcObject = stream;
        localVideo.style.display = data.isVideo ? 'block' : 'none';
        remoteVideo.style.display = 'none';
        remoteAvatarFallback.style.display = 'flex';
        callPeerName.textContent = data.caller.name;
        callStatusSub.textContent = 'Đang kết nối...';
        callTimer.textContent = 'Đang kết nối...';

        activeCallModal.style.display = 'flex';
        setupCallPeerConnection();

        socket.emit('call_accepted', {
            target: data.caller.id,
            isVideo: data.isVideo
        });
    } catch (err) {
        console.error('Không thể mở mic/cam khi nhận cuộc gọi:', err);
        alert('Không thể mở microphone/camera.');
        socket.emit('call_rejected', { target: data.caller.id });
    }
});

declineCallBtn.addEventListener('click', () => {
    stopRingtone();
    incomingCallModal.classList.remove('active');
    if (pendingIncomingCall) {
        socket.emit('call_rejected', { target: pendingIncomingCall.caller.id });
        pendingIncomingCall = null;
    }
});

socket.on('call_accepted', async () => {
    if (!currentCall || !currentCall.isCaller) return;
    stopRingtone();

    callStatusSub.textContent = 'Đã kết nối, đang gửi âm thanh...';
    setupCallPeerConnection();

    try {
        const offer = await currentCall.pc.createOffer();
        await currentCall.pc.setLocalDescription(offer);
        socket.emit('call_signal', {
            target: currentCall.targetId,
            signal: { type: 'offer', sdp: offer }
        });
    } catch (err) {
        console.error('Lỗi tạo call offer:', err);
    }
});

socket.on('call_rejected', () => {
    stopRingtone();
    alert('Đối phương đã từ chối hoặc đang bận.');
    endCurrentCall();
});

socket.on('call_ended', () => {
    stopRingtone();
    endCurrentCall(false);
});

socket.on('call_signal', async (data) => {
    if (!currentCall || !currentCall.pc) return;

    try {
        if (data.signal.type === 'offer') {
            await currentCall.pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
            const answer = await currentCall.pc.createAnswer();
            await currentCall.pc.setLocalDescription(answer);
            socket.emit('call_signal', {
                target: currentCall.targetId,
                signal: { type: 'answer', sdp: answer }
            });
        } else if (data.signal.type === 'answer') {
            await currentCall.pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
        } else if (data.signal.type === 'candidate' && data.signal.candidate) {
            await currentCall.pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        }
    } catch (err) {
        console.error('Lỗi xử lý call signal:', err);
    }
});

function setupCallPeerConnection() {
    const pc = new RTCPeerConnection(rtcConfig);
    currentCall.pc = pc;

    if (currentCall.localStream) {
        currentCall.localStream.getTracks().forEach(track => {
            pc.addTrack(track, currentCall.localStream);
        });
    }

    pc.onicecandidate = (event) => {
        if (event.candidate && currentCall) {
            socket.emit('call_signal', {
                target: currentCall.targetId,
                signal: { type: 'candidate', candidate: event.candidate }
            });
        }
    };

    pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.style.display = 'block';
            remoteAvatarFallback.style.display = 'none';

            if (!currentCall.startTime) {
                currentCall.startTime = Date.now();
                startCallDurationTimer();
            }
        }
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
            if (!currentCall.startTime) {
                currentCall.startTime = Date.now();
                startCallDurationTimer();
            }
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            endCurrentCall();
        }
    };
}

function startCallDurationTimer() {
    if (currentCall.timerInterval) clearInterval(currentCall.timerInterval);
    currentCall.timerInterval = setInterval(() => {
        if (!currentCall || !currentCall.startTime) return;
        const elapsedSec = Math.floor((Date.now() - currentCall.startTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        callTimer.textContent = `${mins}:${secs}`;
    }, 1000);
}

function endCurrentCall(notifyPeer = true) {
    stopRingtone();

    if (currentCall) {
        if (notifyPeer && currentCall.targetId) {
            socket.emit('call_ended', { target: currentCall.targetId });
        }
        if (currentCall.timerInterval) {
            clearInterval(currentCall.timerInterval);
        }
        if (currentCall.localStream) {
            currentCall.localStream.getTracks().forEach(t => t.stop());
        }
        if (currentCall.pc) {
            currentCall.pc.close();
        }
        currentCall = null;
    }

    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
    activeCallModal.style.display = 'none';
}

toggleMicBtn.addEventListener('click', () => {
    if (!currentCall || !currentCall.localStream) return;
    const audioTrack = currentCall.localStream.getAudioTracks()[0];
    if (audioTrack) {
        currentCall.isMuted = !currentCall.isMuted;
        audioTrack.enabled = !currentCall.isMuted;
        toggleMicBtn.classList.toggle('active-off', currentCall.isMuted);
        micIcon.className = currentCall.isMuted ? 'ph-fill ph-microphone-slash' : 'ph-fill ph-microphone';
    }
});

toggleCamBtn.addEventListener('click', () => {
    if (!currentCall || !currentCall.localStream) return;
    const videoTrack = currentCall.localStream.getVideoTracks()[0];
    if (videoTrack) {
        currentCall.isCamOff = !currentCall.isCamOff;
        videoTrack.enabled = !currentCall.isCamOff;
        localVideo.style.display = currentCall.isCamOff ? 'none' : 'block';
        toggleCamBtn.classList.toggle('active-off', currentCall.isCamOff);
        camIcon.className = currentCall.isCamOff ? 'ph-fill ph-video-camera-slash' : 'ph-fill ph-video-camera';
    }
});

endCallBtn.addEventListener('click', () => {
    endCurrentCall(true);
});

voiceCallBtn.addEventListener('click', () => startCall(false));
videoCallBtn.addEventListener('click', () => startCall(true));

// =========================================================
// UI UPDATES & RENDERING (Phong cách Zalo)
// =========================================================
function updateSidebar() {
    const query = userSearchInput.value.toLowerCase().trim();
    clearUserSearchBtn.style.display = query ? 'flex' : 'none';

    let html = '';
    let hasMatches = false;

    // Nhóm chung
    if ("nhóm chung nội bộ".includes(query) || query === "") {
        hasMatches = true;
        const unreadGen = unreadCounts['general'] || 0;
        html += `
            <div class="chat-item ${currentActiveChat === 'general' ? 'active' : ''}" data-id="general" id="chat-general" onclick="switchChat('general')" tabindex="0" role="button" aria-label="Nhóm chung nội bộ">
                <div class="avatar group-avatar">
                    <i class="ph-fill ph-users-three"></i>
                </div>
                <div class="chat-info">
                    <div class="chat-name-row">
                        <span class="chat-name">Nhóm chung nội bộ</span>
                        <span class="chat-time">${escapeHtml(getLastMessageTime('general'))}</span>
                    </div>
                    <div class="chat-last-msg-row">
                        <span class="chat-last-msg">${escapeHtml(getLastMessagePreview('general'))}</span>
                        ${unreadGen > 0 ? `<span class="unread-badge">${unreadGen > 99 ? '99+' : unreadGen}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Danh sách người dùng
    users.forEach(user => {
        if (myInfo && user.id === myInfo.id) return;

        if (user.name.toLowerCase().includes(query) || query === "") {
            hasMatches = true;
            const unread = unreadCounts[user.id] || 0;

            html += `
                <div class="chat-item ${currentActiveChat === user.id ? 'active' : ''}" data-id="${user.id}" onclick="switchChat('${user.id}')" tabindex="0" role="button" aria-label="${escapeHtml(user.name)}">
                    <div class="avatar">
                        <i class="ph-fill ph-user"></i>
                    </div>
                    <div class="chat-info">
                        <div class="chat-name-row">
                            <span class="chat-name" title="${escapeHtml(user.name)}">${escapeHtml(user.name)}</span>
                            <span class="chat-time">${escapeHtml(getLastMessageTime(user.id))}</span>
                        </div>
                        <div class="chat-last-msg-row">
                            <span class="chat-last-msg">${escapeHtml(getLastMessagePreview(user.id))}</span>
                            ${unread > 0 ? `<span class="unread-badge">${unread > 99 ? '99+' : unread}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
    });

    if (!hasMatches) {
        html += `
            <div class="empty-state">
                <i class="ph ph-user-circle-dashed"></i>
                <p>Không tìm thấy người dùng phù hợp.</p>
            </div>
        `;
    }

    chatList.innerHTML = html;

    if (typeof renderChatInfoDrawer === 'function' && appContainer.classList.contains('show-info')) {
        renderChatInfoDrawer({ preservePinInput: true });
    }
    if (typeof renderStorageModal === 'function' && storageModal && storageModal.classList.contains('active')) {
        renderStorageModal();
    }
}

function getChatTitle(chatId) {
    if (chatId === 'general') return 'Nhóm chung nội bộ';
    const onlineUser = users.find(u => u.id === chatId);
    if (onlineUser && onlineUser.name) return onlineUser.name;
    const history = chatHistory[chatId] || [];
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg && !isMessageMine(msg) && msg.from && msg.from.name) {
            return `${msg.from.name} (Offline)`;
        }
    }
    return 'Người dùng đã rời mạng';
}

function updateChatHeader(options = {}) {
    updateCallUIButtons();
    renderPinnedBanner();

    if (currentActiveChat === 'general') {
        currentChatName.textContent = 'Nhóm chung nội bộ';
        currentChatAvatar.innerHTML = `<i class="ph-fill ph-users-three"></i>`;

        const count = users.length;
        if (count <= 1) {
            currentChatSubtitle.textContent = '1 người (Đợi thiết bị khác)';
        } else {
            currentChatSubtitle.textContent = `${count} thành viên Wi-Fi`;
        }
    } else {
        const user = users.find(u => u.id === currentActiveChat);

        if (user) {
            currentChatName.textContent = user.name;
            currentChatAvatar.innerHTML = `<i class="ph-fill ph-user"></i>`;
            const isP2pReady = dataChannels[user.id] && dataChannels[user.id].readyState === 'open';
            currentChatSubtitle.textContent = isP2pReady ? 'Trực tuyến (P2P)' : 'Trực tuyến';
        } else {
            currentChatName.textContent = getChatTitle(currentActiveChat);
            currentChatAvatar.innerHTML = `<i class="ph-fill ph-user-minus"></i>`;
            currentChatSubtitle.textContent = 'Offline';
            voiceCallBtn.style.display = 'none';
            videoCallBtn.style.display = 'none';
        }
    }

    if (typeof renderChatInfoDrawer === 'function' && appContainer.classList.contains('show-info')) {
        renderChatInfoDrawer({ preservePinInput: options.preservePinInput !== false });
    }
}

function getLastMessage(chatId) {
    const history = chatHistory[chatId];
    if (history && history.length > 0) {
        return history[history.length - 1];
    }
    return null;
}

function getLastMessageTime(chatId) {
    const msg = getLastMessage(chatId);
    return msg ? formatTime(msg.timestamp) : '';
}

function getLastMessagePreview(chatId) {
    const msg = getLastMessage(chatId);
    if (!msg) {
        return chatId === 'general' ? 'Chưa có tin nhắn' : 'Bắt đầu trò chuyện';
    }
    const isMine = isMessageMine(msg);
    const prefix = isMine ? 'Bạn: ' : '';
    if (msg.isFile) {
        return `${prefix}[Tập tin] ${msg.fileName || 'file'}`;
    }
    return `${prefix}${msg.content || ''}`;
}

window.switchChat = function (chatId) {
    currentActiveChat = chatId;
    unreadCounts[chatId] = 0;
    updateTabTitle();

    msgSearchQuery = '';
    messageSearchInput.value = '';
    messageSearchContainer.style.display = 'none';
    toggleMsgSearchBtn.style.display = 'block';

    // Chuyển toàn màn hình sang khung chat trên điện thoại
    appContainer.classList.add('show-chat');

    updateSidebar();
    updateChatHeader({ preservePinInput: false });
    renderChatHistory();
};

function renderChatHistory() {
    messagesContainer.innerHTML = '<div class="date-divider"><span>Hôm nay</span></div>';

    const history = chatHistory[currentActiveChat] || [];
    let displayedCount = 0;

    history.forEach(msg => {
        if (msgSearchQuery && !msg.isFile) {
            if (msg.content && msg.content.toLowerCase().includes(msgSearchQuery)) {
                renderMessage(msg, true);
                displayedCount++;
            }
        } else if (!msgSearchQuery) {
            renderMessage(msg, false);
            displayedCount++;
        }
    });

    if (history.length === 0) {
        if (currentActiveChat === 'general') {
            messagesContainer.innerHTML += `
                <div class="empty-state">
                    <i class="ph ph-chats-circle"></i>
                    <p>Chào mừng đến với kênh Wi-Fi nội bộ!<br>Truyền tin nhắn, hình ảnh và gọi P2P tốc độ cao.</p>
                </div>
            `;
        } else {
            messagesContainer.innerHTML += `
                <div class="empty-state">
                    <i class="ph ph-chat-teardrop-dots"></i>
                    <p>Chưa có tin nhắn. Hãy gửi tin nhắn hoặc gọi thoại để bắt đầu trò chuyện!</p>
                </div>
            `;
        }
    } else if (msgSearchQuery && displayedCount === 0) {
        messagesContainer.innerHTML += `
            <div class="empty-state">
                <i class="ph ph-magnifying-glass"></i>
                <p>Không tìm thấy tin nhắn phù hợp.</p>
            </div>
        `;
    }

    scrollToBottom();
}

function renderMessage(msg, isHighlighted = false) {
    // Xác định chuẩn xác: Tin nhắn của thiết bị này -> Luôn bên phải. Của đối phương -> Luôn bên trái.
    const isMine = isMessageMine(msg);
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isMine ? 'mine' : ''}`;

    let contentHtml = '';
    if (msg.isFile) {
        const safeFileName = escapeHtml(msg.fileName || 'tap-tin');
        const formattedSize = msg.fileSize ? formatFileSize(msg.fileSize) : 'Tải xuống';
        const isImg = isImageFile(msg.fileName);
        const isVid = isVideoFile(msg.fileName);

        const localBlobUrl = msg.fileUrl || restoredFileUrls[msg.id];
        const downloadUrl = localBlobUrl || msg.relayFileUrl;

        if (isImg && localBlobUrl) {
            contentHtml = `
                <div class="msg-image-wrap js-open-image">
                    <img src="${escapeHtml(localBlobUrl)}" alt="${safeFileName}" class="msg-image-preview">
                </div>
                <a href="${escapeHtml(localBlobUrl)}" target="_blank" download="${safeFileName}" class="msg-file">
                    <i class="ph-fill ph-file-image"></i>
                    <div class="file-info">
                        <span class="file-name">${safeFileName}</span>
                        <span class="file-size">${formattedSize}</span>
                    </div>
                </a>
            `;
        } else if (isVid && downloadUrl) {
            const subLabel = !localBlobUrl && msg.relayFileUrl
                ? `${formattedSize} • Tải từ Relay`
                : formattedSize;
            contentHtml = `
                ${localBlobUrl ? `
                    <div class="video-thumb-card js-open-video" role="button" tabindex="0">
                        <div class="video-play-badge"><i class="ph-fill ph-play"></i></div>
                        <div class="file-info" style="min-width:0;flex:1;">
                            <span class="file-name" style="color:#fff;">${safeFileName}</span>
                            <span class="file-size" style="color:#cbd5e1;">Bấm để phát video • ${formattedSize}</span>
                        </div>
                    </div>
                ` : ''}
                <a href="${escapeHtml(downloadUrl)}" target="_blank" download="${safeFileName}" class="msg-file">
                    <i class="ph-fill ph-video-camera"></i>
                    <div class="file-info">
                        <span class="file-name">${safeFileName}</span>
                        <span class="file-size">${subLabel}</span>
                    </div>
                </a>
            `;
        } else if (downloadUrl) {
            const subLabel = !localBlobUrl && msg.relayFileUrl
                ? `${formattedSize} • Tải từ Relay`
                : formattedSize;
            contentHtml = `
                <a href="${escapeHtml(downloadUrl)}" target="_blank" download="${safeFileName}" class="msg-file">
                    <i class="ph-fill ${isImg ? 'ph-file-image' : 'ph-file-doc'}"></i>
                    <div class="file-info">
                        <span class="file-name">${safeFileName}</span>
                        <span class="file-size">${subLabel}</span>
                    </div>
                </a>
            `;
        } else {
            contentHtml = `
                <div class="msg-file" style="opacity: 0.7;">
                    <i class="ph-fill ph-file-dashed"></i>
                    <div class="file-info">
                        <span class="file-name">${safeFileName}</span>
                        <span class="file-size">Đã lưu trữ (${formattedSize})</span>
                    </div>
                </div>
            `;
        }
    } else {
        contentHtml = formatMessageText(msg.content);
    }

    const senderName = msg.from ? escapeHtml(msg.from.name || 'Người dùng') : 'Người dùng';
    const pinButtonHtml = (!msg.isFile && msg.content)
        ? `<button type="button" class="msg-pin-btn" title="Ghim tin nhắn này" aria-label="Ghim tin nhắn"><i class="ph ph-push-pin"></i></button>`
        : '';

    msgDiv.innerHTML = `
        <div class="avatar">
            <i class="ph-fill ph-user"></i>
        </div>
        <div class="msg-content-wrapper">
            <span class="msg-sender">${senderName}</span>
            <div class="msg-bubble ${isHighlighted ? 'highlighted' : ''}">
                ${contentHtml}
                <div class="msg-meta-row" style="display:flex;align-items:center;justify-content:flex-end;gap:2px;">
                    <span class="msg-time">${escapeHtml(formatTime(msg.timestamp))}</span>
                    ${pinButtonHtml}
                </div>
            </div>
        </div>
    `;

    const imgWrap = msgDiv.querySelector('.js-open-image');
    if (imgWrap) {
        const localBlobUrl = msg.fileUrl || restoredFileUrls[msg.id];
        imgWrap.addEventListener('click', () => {
            openImageModal(localBlobUrl, msg.fileName || 'Hình ảnh');
        });
    }

    const vidCard = msgDiv.querySelector('.js-open-video');
    if (vidCard) {
        const localBlobUrl = msg.fileUrl || restoredFileUrls[msg.id];
        const downloadUrl = localBlobUrl || msg.relayFileUrl;
        const triggerOpenVideo = () => openVideoModal(localBlobUrl, msg.fileName || 'Video', downloadUrl);
        vidCard.addEventListener('click', triggerOpenVideo);
        vidCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerOpenVideo();
            }
        });
    }

    const msgPinBtn = msgDiv.querySelector('.msg-pin-btn');
    if (msgPinBtn) {
        msgPinBtn.addEventListener('click', () => {
            submitPinnedMessage(currentActiveChat, msg.content);
        });
    }

    messagesContainer.appendChild(msgDiv);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Lightbox xem ảnh
window.openImageModal = function (url, name) {
    if (!url) return;
    imageModalImg.src = url;
    imageModalTitle.textContent = name || 'Hình ảnh';
    imageModalDownload.href = url;
    imageModalDownload.download = name || 'download.png';
    imageModal.classList.add('active');
};

imageModalClose.addEventListener('click', () => {
    imageModal.classList.remove('active');
});

imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.classList.remove('active');
    }
});

// Lightbox phát video
function openVideoModal(videoUrl, name, downloadUrl) {
    if (!videoUrl || !videoModal || !videoModalPlayer) return;
    videoModalTitle.textContent = name || 'Xem video';
    videoModalPlayer.src = videoUrl;
    if (videoModalDownload) {
        videoModalDownload.href = downloadUrl || videoUrl;
        videoModalDownload.download = name || 'video.mp4';
    }
    videoModal.classList.add('active');
    videoModalPlayer.play().catch(() => {});
}
window.openVideoModal = openVideoModal;

function closeVideoModal() {
    if (!videoModal) return;
    videoModal.classList.remove('active');
    if (videoModalPlayer) {
        videoModalPlayer.pause();
        videoModalPlayer.removeAttribute('src');
        videoModalPlayer.load();
    }
}

if (videoModalClose) {
    videoModalClose.addEventListener('click', closeVideoModal);
}
if (videoModal) {
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) {
            closeVideoModal();
        }
    });
}

// Nút quay lại trên Mobile (Trở về danh sách Zalo)
mobileBackBtn.addEventListener('click', () => {
    closeChatInfoDrawer();
    appContainer.classList.remove('show-chat');
});

// =========================================================
// CONVERSATION INFO DRAWER (Mở rộng đoạn chat kiểu Zalo)
// =========================================================
function openChatInfoDrawer() {
    if (!appContainer) return;
    appContainer.classList.add('show-info');
    if (toggleChatInfoBtn) toggleChatInfoBtn.classList.add('active');
    renderChatInfoDrawer({ preservePinInput: false });
}

function closeChatInfoDrawer() {
    if (!appContainer) return;
    appContainer.classList.remove('show-info');
    if (toggleChatInfoBtn) toggleChatInfoBtn.classList.remove('active');
}

function renderChatInfoDrawer(options = {}) {
    if (!chatInfoDrawer || !appContainer.classList.contains('show-info')) return;
    const preservePinInput = Boolean(options.preservePinInput);

    // 1. Summary header card
    if (currentActiveChat === 'general') {
        if (drawerChatAvatar) drawerChatAvatar.innerHTML = '<i class="ph-fill ph-users-three"></i>';
        if (drawerChatTitle) drawerChatTitle.textContent = 'Nhóm chung nội bộ';
        if (drawerChatSubtitle) {
            const roomTag = (myInfo && myInfo.roomMode === 'custom' && myInfo.roomCode)
                ? `Phòng ${myInfo.roomCode}`
                : 'Tự động theo mạng';
            drawerChatSubtitle.textContent = `${users.length} thành viên • ${roomTag}`;
        }
        if (drawerQuickActions) drawerQuickActions.style.display = 'none';
    } else {
        const peer = users.find(u => u.id === currentActiveChat);
        if (drawerChatAvatar) {
            drawerChatAvatar.innerHTML = peer ? '<i class="ph-fill ph-user"></i>' : '<i class="ph-fill ph-user-minus"></i>';
        }
        if (drawerChatTitle) drawerChatTitle.textContent = getChatTitle(currentActiveChat);
        if (peer) {
            const isP2p = Boolean(dataChannels[peer.id] && dataChannels[peer.id].readyState === 'open');
            const shortId = (peer.deviceId || peer.id || '').slice(-6);
            if (drawerChatSubtitle) {
                drawerChatSubtitle.textContent = `${peer.ip || 'Không rõ IP'} • ID ${shortId} • ${isP2p ? 'P2P trực tiếp' : 'Qua Relay'}`;
            }
            if (drawerQuickActions) drawerQuickActions.style.display = 'flex';
        } else {
            if (drawerChatSubtitle) drawerChatSubtitle.textContent = 'Ngoại tuyến (chỉ xem dữ liệu đệm)';
            if (drawerQuickActions) drawerQuickActions.style.display = 'none';
        }
    }

    // 2. Members list
    renderDrawerMembers();

    // 3. Pinned message editor
    renderDrawerPinSection(preservePinInput);

    // 4. Shared media & links
    renderDrawerMedia();

    // 5. Per-chat cache summary
    renderDrawerStorage();
}

function buildMemberRowHtml(userObj, isSelf) {
    const safeName = escapeHtml((userObj && userObj.name) || 'Người dùng');
    const initial = escapeHtml(((userObj && userObj.name) || 'U').trim().charAt(0).toUpperCase() || 'U');
    const shortId = escapeHtml(((userObj && (userObj.deviceId || userObj.id)) || '').slice(-6));
    const ipText = escapeHtml((userObj && userObj.ip) || 'Ẩn IP');
    const isP2p = Boolean(!isSelf && userObj && dataChannels[userObj.id] && dataChannels[userObj.id].readyState === 'open');

    const badgeHtml = isSelf
        ? '<span class="badge-pill badge-self">Bạn</span>'
        : `<span class="badge-pill ${isP2p ? 'badge-p2p' : 'badge-relay'}">${isP2p ? 'P2P trực tiếp' : 'Qua Relay'}</span>`;

    return `
        <div class="drawer-member-item ${isSelf ? 'is-self' : ''}" data-member-id="${escapeHtml((userObj && userObj.id) || '')}" role="${isSelf ? 'listitem' : 'button'}" tabindex="${isSelf ? '-1' : '0'}">
            <div class="drawer-member-avatar">${initial}</div>
            <div class="drawer-member-info">
                <div class="drawer-member-name">
                    <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;">${safeName}</span>
                    ${badgeHtml}
                </div>
                <div class="drawer-member-meta">IP: ${ipText}${shortId ? ` • ID ${shortId}` : ''}</div>
            </div>
        </div>
    `;
}

function renderDrawerMembers() {
    if (!drawerMembersSection || !drawerMembersList || !drawerMembersHeading) return;
    if (currentActiveChat === 'general') {
        drawerMembersHeading.textContent = `Thành viên (${users.length})`;
        const sorted = [...users].sort((a, b) => {
            const aSelf = myInfo && a.id === myInfo.id ? 0 : 1;
            const bSelf = myInfo && b.id === myInfo.id ? 0 : 1;
            if (aSelf !== bSelf) return aSelf - bSelf;
            return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
        });
        if (sorted.length === 0) {
            drawerMembersList.innerHTML = '<div class="drawer-media-empty">Chưa có thiết bị nào kết nối.</div>';
        } else {
            drawerMembersList.innerHTML = sorted
                .map(u => buildMemberRowHtml(u, Boolean(myInfo && u.id === myInfo.id)))
                .join('');
        }
    } else {
        const peer = users.find(u => u.id === currentActiveChat);
        drawerMembersHeading.textContent = peer ? 'Chi tiết thành viên (2)' : 'Chi tiết cuộc trò chuyện';
        let html = '';
        if (peer) {
            html += buildMemberRowHtml(peer, false);
        } else {
            html += `
                <div class="drawer-member-item is-self">
                    <div class="drawer-member-avatar"><i class="ph-fill ph-user-minus"></i></div>
                    <div class="drawer-member-info">
                        <div class="drawer-member-name">${escapeHtml(getChatTitle(currentActiveChat))}</div>
                        <div class="drawer-member-meta">Thiết bị hiện đang ngoại tuyến</div>
                    </div>
                </div>
            `;
        }
        if (myInfo) {
            html += buildMemberRowHtml(myInfo, true);
        }
        drawerMembersList.innerHTML = html;
    }
}

function renderDrawerPinSection(preservePinInput) {
    if (!drawerPinSection) return;
    if (drawerPinResetBtn) {
        drawerPinResetBtn.style.display = currentActiveChat === 'general' ? 'inline-flex' : 'none';
    }
    const effective = getEffectivePin(currentActiveChat);
    if (drawerPinCurrent) {
        const hasPin = !effective.isCleared && Boolean(effective.text);
        drawerPinCurrent.textContent = hasPin
            ? `${effective.updatedBy && !effective.isDefault ? `${effective.updatedBy}: ` : ''}${effective.text}`
            : 'Chưa có tin nhắn ghim.';
        drawerPinCurrent.classList.toggle('is-empty', !hasPin);
    }
    if (drawerPinInput && !(preservePinInput && document.activeElement === drawerPinInput)) {
        drawerPinInput.value = effective.isCleared ? '' : effective.text;
    }
}

function collectSharedMediaForChat(chatId) {
    const history = chatHistory[chatId] || [];
    const images = [];
    const videos = [];
    const files = [];
    const links = [];

    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (!msg) continue;
        if (msg.isFile) {
            const localBlobUrl = msg.fileUrl || restoredFileUrls[msg.id] || '';
            const downloadUrl = localBlobUrl || msg.relayFileUrl || '';
            const entry = {
                id: msg.id,
                fileName: msg.fileName || 'tap-tin',
                fileSize: msg.fileSize || 0,
                timestamp: msg.timestamp,
                localBlobUrl,
                downloadUrl,
                senderName: (msg.from && msg.from.name) || 'Người dùng'
            };
            if (isImageFile(entry.fileName)) {
                images.push(entry);
            } else if (isVideoFile(entry.fileName)) {
                videos.push(entry);
            } else {
                files.push(entry);
            }
        } else if (msg.content) {
            const urls = extractUrlsFromText(msg.content);
            urls.forEach(url => {
                links.push({
                    url,
                    senderName: (msg.from && msg.from.name) || 'Người dùng',
                    timestamp: msg.timestamp
                });
            });
        }
    }

    return { images, videos, files, links };
}

function renderDrawerMedia() {
    if (!drawerMediaSection) return;
    const { images, videos, files, links } = collectSharedMediaForChat(currentActiveChat);
    const visualItems = [
        ...images.map(item => ({ ...item, kind: 'image' })),
        ...videos.map(item => ({ ...item, kind: 'video' }))
    ];
    const groups = { images: visualItems, files, links };
    const limits = { images: 8, files: 3, links: 3 };

    if (countMediaImages) countMediaImages.textContent = String(visualItems.length);
    if (countMediaFiles) countMediaFiles.textContent = String(files.length);
    if (countMediaLinks) countMediaLinks.textContent = String(links.length);

    drawerMediaToggles.forEach(toggle => {
        const category = toggle.dataset.drawerMediaToggle;
        const body = document.getElementById(toggle.getAttribute('aria-controls'));
        const isOpen = Boolean(drawerMediaOpen[category]);
        toggle.setAttribute('aria-expanded', String(isOpen));
        if (body) body.classList.toggle('is-collapsed', !isOpen);
        const caret = toggle.querySelector('.drawer-caret');
        if (caret) caret.className = `ph ph-caret-${isOpen ? 'up' : 'down'} drawer-caret`;
    });

    Object.entries(groups).forEach(([category, items]) => {
        const content = drawerMediaContents[category];
        if (!content) return;
        content.replaceChildren();
        const limit = limits[category];
        const visibleItems = drawerMediaExpanded[category] ? items : items.slice(0, limit);

        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'drawer-media-empty';
            empty.textContent = category === 'images'
                ? 'Chưa có ảnh hoặc video nào được chia sẻ.'
                : category === 'files' ? 'Chưa có tệp tài liệu nào.' : 'Chưa có đường dẫn (link) nào.';
            content.appendChild(empty);
        } else if (category === 'images') {
            const grid = document.createElement('div');
            grid.className = 'drawer-image-grid';
            visibleItems.forEach(item => {
                const canOpenImage = item.kind === 'image' && Boolean(item.localBlobUrl);
                const canDownload = Boolean(item.downloadUrl);
                const thumb = document.createElement(canDownload && !canOpenImage && !item.localBlobUrl ? 'a' : 'button');
                thumb.className = `drawer-image-thumb${item.kind === 'video' ? ' drawer-video-thumb' : ''}`;
                thumb.title = item.fileName;
                if (thumb.tagName === 'BUTTON') thumb.type = 'button';
                if (thumb.tagName === 'A') {
                    thumb.href = item.downloadUrl;
                    thumb.target = '_blank';
                    thumb.rel = 'noopener noreferrer';
                    thumb.download = item.fileName;
                }

                if (canOpenImage) {
                    const img = document.createElement('img');
                    img.src = item.localBlobUrl;
                    img.alt = item.fileName;
                    img.loading = 'lazy';
                    thumb.appendChild(img);
                    thumb.addEventListener('click', () => openImageModal(item.localBlobUrl, item.fileName));
                } else {
                    thumb.innerHTML = item.kind === 'video'
                        ? '<i class="ph-fill ph-play-circle" aria-hidden="true"></i>'
                        : '<i class="ph-fill ph-image" aria-hidden="true"></i>';
                    if (item.kind === 'video' && item.localBlobUrl) {
                        thumb.addEventListener('click', () => openVideoModal(item.localBlobUrl, item.fileName, item.downloadUrl));
                    }
                }
                grid.appendChild(thumb);
            });
            content.appendChild(grid);
        } else {
            const list = document.createElement('div');
            list.className = 'drawer-item-list';
            visibleItems.forEach(item => {
                if (category === 'files') {
                    const card = document.createElement(item.downloadUrl ? 'a' : 'div');
                    card.className = 'drawer-item-card';
                    if (item.downloadUrl) {
                        card.href = item.downloadUrl;
                        card.target = '_blank';
                        card.rel = 'noopener noreferrer';
                        card.download = item.fileName;
                    } else {
                        card.classList.add('is-unavailable');
                    }
                    card.innerHTML = `
                        <div class="drawer-item-icon"><i class="ph-fill ph-file-zip"></i></div>
                        <div class="drawer-item-info">
                            <div class="drawer-item-name">${escapeHtml(item.fileName)}</div>
                            <div class="drawer-item-meta">${escapeHtml(formatFileSize(item.fileSize))} • ${escapeHtml(formatTime(item.timestamp))}${item.downloadUrl ? '' : ' • Không còn tệp đệm'}</div>
                        </div>
                    `;
                    list.appendChild(card);
                    return;
                }

                const card = document.createElement('a');
                card.className = 'drawer-item-card';
                card.href = item.url;
                card.target = '_blank';
                card.rel = 'noopener noreferrer';
                card.innerHTML = `
                    <div class="drawer-item-icon"><i class="ph ph-link"></i></div>
                    <div class="drawer-item-info">
                        <div class="drawer-item-name">${escapeHtml(item.url)}</div>
                        <div class="drawer-item-meta">${escapeHtml(item.senderName)} • ${escapeHtml(formatTime(item.timestamp))}</div>
                    </div>
                `;
                list.appendChild(card);
            });
            content.appendChild(list);
        }

        const moreButton = drawerMediaSection.querySelector(`[data-drawer-media-more="${category}"]`);
        if (moreButton) {
            moreButton.hidden = items.length <= limit;
            moreButton.textContent = drawerMediaExpanded[category] ? 'Thu gọn' : 'Xem tất cả';
        }
    });
}

function renderDrawerStorage() {
    if (!drawerStorageStats) return;
    const stats = getChatStorageStats(currentActiveChat);
    drawerStorageStats.innerHTML = `
        <div class="drawer-storage-metric">
            <span>Dung lượng tệp</span>
            <strong>${escapeHtml(formatFileSize(stats.fileBytes))}</strong>
            <small>${stats.fileCount} tệp trong bộ nhớ đệm</small>
        </div>
        <div class="drawer-storage-metric">
            <span>Tin nhắn</span>
            <strong>${stats.messageCount}</strong>
            <small>tin nhắn đã lưu</small>
        </div>
    `;
    if (clearCurrentChatCacheBtn) {
        clearCurrentChatCacheBtn.disabled = stats.messageCount === 0 && stats.fileCount === 0;
    }
}

async function clearChatCache(chatId, skipConfirm = false) {
    const title = getChatTitle(chatId);
    if (!skipConfirm) {
        const ok = confirm(`Xóa toàn bộ tin nhắn và tệp đệm của "${title}" khỏi trình duyệt?`);
        if (!ok) return;
    }
    const stats = getChatStorageStats(chatId);
    const history = chatHistory[chatId] || [];
    history.forEach(m => {
        if (m && typeof m.fileUrl === 'string' && m.fileUrl.startsWith('blob:')) {
            try { URL.revokeObjectURL(m.fileUrl); } catch (e) {}
            m.fileUrl = '';
        }
    });

    await deleteIndexedDbFilesByIds(stats.fileIds);

    if (chatId === 'general') {
        chatHistory['general'] = [];
    } else {
        delete chatHistory[chatId];
    }
    unreadCounts[chatId] = 0;

    savePersistedHistory();
    updateTabTitle();
    updateSidebar();
    if (currentActiveChat === chatId) {
        renderChatHistory();
    }
    renderChatInfoDrawer({ preservePinInput: true });
    if (storageModal && storageModal.classList.contains('active')) {
        renderStorageModal();
    }
}

if (toggleChatInfoBtn) {
    toggleChatInfoBtn.addEventListener('click', () => {
        if (appContainer.classList.contains('show-info')) {
            closeChatInfoDrawer();
        } else {
            openChatInfoDrawer();
        }
    });
}
if (closeChatInfoBtn) {
    closeChatInfoBtn.addEventListener('click', closeChatInfoDrawer);
}
if (drawerVoiceCallBtn) {
    drawerVoiceCallBtn.addEventListener('click', () => startCall(false));
}
if (drawerVideoCallBtn) {
    drawerVideoCallBtn.addEventListener('click', () => startCall(true));
}
if (drawerMembersToggle && drawerMembersBody) {
    drawerMembersToggle.addEventListener('click', () => {
        drawerMembersBody.classList.toggle('is-collapsed');
        drawerMembersToggle.setAttribute('aria-expanded', String(!drawerMembersBody.classList.contains('is-collapsed')));
        const caret = drawerMembersToggle.querySelector('.ph-caret-up, .ph-caret-down');
        if (caret) {
            caret.className = drawerMembersBody.classList.contains('is-collapsed') ? 'ph ph-caret-down' : 'ph ph-caret-up';
        }
    });
}
if (drawerPinToggle && drawerPinBody) {
    drawerPinToggle.addEventListener('click', () => {
        drawerPinBody.classList.toggle('is-collapsed');
        drawerPinToggle.setAttribute('aria-expanded', String(!drawerPinBody.classList.contains('is-collapsed')));
        const caret = drawerPinToggle.querySelector('.ph-caret-up, .ph-caret-down');
        if (caret) {
            caret.className = drawerPinBody.classList.contains('is-collapsed') ? 'ph ph-caret-down' : 'ph ph-caret-up';
        }
    });
}
if (drawerMembersList) {
    drawerMembersList.addEventListener('click', (e) => {
        const row = e.target.closest('.drawer-member-item');
        if (!row || row.classList.contains('is-self')) return;
        const memberId = row.dataset.memberId;
        if (memberId) {
            switchChat(memberId);
            if (window.innerWidth <= 900) {
                closeChatInfoDrawer();
            }
        }
    });
}
if (drawerPinForm) {
    drawerPinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = drawerPinInput ? drawerPinInput.value : '';
        submitPinnedMessage(currentActiveChat, val);
    });
}
if (drawerPinClearBtn) {
    drawerPinClearBtn.addEventListener('click', () => {
        submitPinnedMessage(currentActiveChat, '');
    });
}
if (drawerPinResetBtn) {
    drawerPinResetBtn.addEventListener('click', () => {
        if (currentActiveChat === 'general') {
            submitPinnedMessage('general', '', { resetDefault: true });
        }
    });
}
drawerMediaToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const category = toggle.dataset.drawerMediaToggle;
        if (!Object.prototype.hasOwnProperty.call(drawerMediaOpen, category)) return;
        drawerMediaOpen[category] = !drawerMediaOpen[category];
        renderDrawerMedia();
    });
});
drawerMediaMoreButtons.forEach(button => {
    button.addEventListener('click', () => {
        const category = button.dataset.drawerMediaMore;
        if (!Object.prototype.hasOwnProperty.call(drawerMediaExpanded, category)) return;
        drawerMediaExpanded[category] = !drawerMediaExpanded[category];
        renderDrawerMedia();
    });
});
if (clearCurrentChatCacheBtn) {
    clearCurrentChatCacheBtn.addEventListener('click', () => {
        clearChatCache(currentActiveChat);
    });
}
if (drawerOpenGlobalStorageBtn) {
    drawerOpenGlobalStorageBtn.addEventListener('click', () => {
        openStorageModal();
    });
}

// =========================================================
// GLOBAL STORAGE & SETTINGS MODAL (Quản lý bộ nhớ đệm toàn bộ chat)
// =========================================================
function syncSettingsInputs() {
    if (settingHistoryLimit) {
        settingHistoryLimit.value = String(appSettings.historyLimit);
    }
    if (settingSaveMedia) {
        settingSaveMedia.checked = Boolean(appSettings.saveMedia);
    }
    if (settingSoundEnabled) {
        settingSoundEnabled.checked = Boolean(appSettings.soundEnabled);
    }
}

async function renderStorageModal() {
    if (!storageModal) return;
    syncSettingsInputs();

    const chatIds = Array.from(new Set([
        'general',
        ...Object.keys(chatHistory),
        ...Object.values(indexedDbFileMeta).map(m => m && m.chatId).filter(Boolean)
    ]));

    let totalMsgs = 0;
    let totalFiles = 0;
    let totalBytes = 0;
    const rows = [];

    chatIds.forEach(cid => {
        const stats = getChatStorageStats(cid);
        totalMsgs += stats.messageCount;
        totalFiles += stats.fileCount;
        totalBytes += stats.fileBytes;
        if (cid === 'general' || stats.messageCount > 0 || stats.fileCount > 0) {
            rows.push({
                chatId: cid,
                title: getChatTitle(cid),
                ...stats
            });
        }
    });

    if (storageTotalMsgs) {
        storageTotalMsgs.textContent = `${totalMsgs} tin`;
    }
    if (storageTotalFiles) {
        storageTotalFiles.textContent = `${totalFiles} (${formatFileSize(totalBytes)})`;
    }

    let localStorageBytes = 0;
    try {
        const raw = localStorage.getItem('localchat_history_v1') || '';
        localStorageBytes = raw.length * 2;
    } catch (e) {}

    if (storageBrowserQuota) {
        const approxTotal = totalBytes + localStorageBytes;
        storageBrowserQuota.textContent = `~${formatFileSize(approxTotal)}`;
        if (navigator.storage && typeof navigator.storage.estimate === 'function') {
            navigator.storage.estimate().then(est => {
                if (!storageBrowserQuota) return;
                if (est && typeof est.usage === 'number') {
                    const quotaStr = est.quota ? ` / ${formatFileSize(est.quota)}` : '';
                    storageBrowserQuota.textContent = `${formatFileSize(est.usage)}${quotaStr}`;
                }
            }).catch(() => {});
        }
    }

    if (storageChatList) {
        if (rows.length === 0) {
            storageChatList.innerHTML = '<div class="drawer-media-empty">Chưa có dữ liệu đoạn chat nào được lưu.</div>';
        } else {
            storageChatList.innerHTML = rows.map(r => {
                const isEmpty = r.messageCount === 0 && r.fileCount === 0;
                return `
                    <div class="storage-chat-row">
                        <div class="storage-chat-row-info">
                            <div class="storage-chat-row-name">${escapeHtml(r.title)}</div>
                            <div class="storage-chat-row-meta">${r.messageCount} tin nhắn • ${r.fileCount} tệp (${escapeHtml(formatFileSize(r.fileBytes))})</div>
                        </div>
                        <button type="button" class="btn btn-danger-soft btn-xs js-clear-storage-chat" data-chat-id="${escapeHtml(r.chatId)}" ${isEmpty ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                            Xóa đệm
                        </button>
                    </div>
                `;
            }).join('');
        }
    }
}

function openStorageModal() {
    if (!storageModal) return;
    storageModal.classList.add('active');
    renderStorageModal();
}

function closeStorageModal() {
    if (!storageModal) return;
    storageModal.classList.remove('active');
}

if (openStorageModalBtn) {
    openStorageModalBtn.addEventListener('click', openStorageModal);
}
if (closeStorageModalBtn) {
    closeStorageModalBtn.addEventListener('click', closeStorageModal);
}
if (storageModal) {
    storageModal.addEventListener('click', (e) => {
        if (e.target === storageModal) closeStorageModal();
    });
}
if (storageChatList) {
    storageChatList.addEventListener('click', (e) => {
        const btn = e.target.closest('.js-clear-storage-chat');
        if (!btn || btn.disabled) return;
        const cid = btn.dataset.chatId;
        if (cid) clearChatCache(cid);
    });
}
if (settingHistoryLimit) {
    settingHistoryLimit.addEventListener('change', () => {
        const val = Number(settingHistoryLimit.value);
        appSettings.historyLimit = Number.isFinite(val) && val >= 0 ? val : 50;
        saveAppSettings();
        Object.keys(chatHistory).forEach(k => {
            chatHistory[k] = applyHistoryLimit(chatHistory[k]);
        });
        savePersistedHistory();
        updateSidebar();
        renderChatHistory();
        renderChatInfoDrawer({ preservePinInput: true });
        renderStorageModal();
    });
}
if (settingSaveMedia) {
    settingSaveMedia.addEventListener('change', () => {
        appSettings.saveMedia = Boolean(settingSaveMedia.checked);
        saveAppSettings();
    });
}
if (settingSoundEnabled) {
    settingSoundEnabled.addEventListener('change', () => {
        appSettings.soundEnabled = Boolean(settingSoundEnabled.checked);
        saveAppSettings();
    });
}
if (clearAllMediaBtn) {
    clearAllMediaBtn.addEventListener('click', async () => {
        const ok = confirm('Xóa toàn bộ ảnh, video và tệp trong bộ nhớ đệm IndexedDB? Tin nhắn văn bản vẫn được giữ lại.');
        if (!ok) return;
        Object.values(chatHistory).forEach(list => {
            (list || []).forEach(m => {
                if (m && typeof m.fileUrl === 'string' && m.fileUrl.startsWith('blob:')) {
                    try { URL.revokeObjectURL(m.fileUrl); } catch (e) {}
                    m.fileUrl = '';
                }
            });
        });
        await clearAllIndexedDbFiles();
        renderChatHistory();
        renderChatInfoDrawer({ preservePinInput: true });
        renderStorageModal();
    });
}
if (clearAllCacheBtn) {
    clearAllCacheBtn.addEventListener('click', async () => {
        const ok = confirm('Xóa toàn bộ lịch sử tin nhắn, tin nhắn ghim đã lưu và tệp đệm của TẤT CẢ đoạn chat? (Tên thiết bị và ID vẫn được giữ lại)');
        if (!ok) return;
        Object.values(chatHistory).forEach(list => {
            (list || []).forEach(m => {
                if (m && typeof m.fileUrl === 'string' && m.fileUrl.startsWith('blob:')) {
                    try { URL.revokeObjectURL(m.fileUrl); } catch (e) {}
                }
            });
        });
        await clearAllIndexedDbFiles();
        chatHistory = { general: [] };
        unreadCounts = { general: 0 };
        seenMessageIds.clear();
        pinnedMessages = { general: null, peers: {} };
        try {
            localStorage.removeItem('localchat_history_v1');
            localStorage.removeItem(PINNED_STORAGE_KEY);
        } catch (e) {}
        updateTabTitle();
        updateSidebar();
        updateChatHeader({ preservePinInput: false });
        renderChatHistory();
        renderChatInfoDrawer({ preservePinInput: false });
        renderStorageModal();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (videoModal && videoModal.classList.contains('active')) {
            closeVideoModal();
        } else if (storageModal && storageModal.classList.contains('active')) {
            closeStorageModal();
        }
    }
});

// Pinned Message Toggle
togglePinnedBtn.addEventListener('click', () => {
    pinnedMessageContainer.classList.toggle('collapsed');
    pinnedCaretIcon.className = pinnedMessageContainer.classList.contains('collapsed') ? 'ph ph-caret-down' : 'ph ph-caret-up';
});

// Gửi tin nhắn
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (!content) return;

    const timestamp = new Date().toISOString();
    const msgId = generateId();
    seenMessageIds.add(msgId);

    const payload = {
        id: msgId,
        senderDeviceId: myDeviceId, // Kèm ID thiết bị cố định
        type: 'text',
        to: currentActiveChat,
        content: content,
        timestamp: timestamp
    };

    sendViaWebRTC(payload);

    const msg = {
        id: msgId,
        senderDeviceId: myDeviceId,
        from: myInfo,
        to: currentActiveChat,
        content: content,
        isFile: false,
        timestamp: timestamp,
        isMine: true
    };

    if (!chatHistory[currentActiveChat]) chatHistory[currentActiveChat] = [];
    chatHistory[currentActiveChat].push(msg);
    savePersistedHistory();

    renderMessage(msg);
    scrollToBottom();
    updateSidebar();
    if (appContainer.classList.contains('show-info')) {
        renderChatInfoDrawer({ preservePinInput: true });
    }
    if (storageModal && storageModal.classList.contains('active')) {
        renderStorageModal();
    }

    messageInput.value = '';
});

// Đính kèm tập tin
attachBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    attachBtn.disabled = true;
    try {
        await sendFile(file, currentActiveChat);
    } finally {
        fileInput.value = '';
        attachBtn.disabled = false;
    }
});

// Kéo thả tập tin
const chatArea = document.getElementById('chat-area');

['dragenter', 'dragover'].forEach(eventName => {
    chatArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        chatArea.classList.add('drag-over');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    chatArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        chatArea.classList.remove('drag-over');
    }, false);
});

chatArea.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
        await sendFile(files[0], currentActiveChat);
    }
});

// Dán ảnh từ Clipboard (Ctrl + V)
window.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
                const ext = item.type.split('/')[1] || 'png';
                const file = new File([blob], `screenshot_${Date.now()}.${ext}`, { type: item.type });
                await sendFile(file, currentActiveChat);
            }
        }
    }
});

// Đổi tên
renameBtn.addEventListener('click', () => {
    newNameInput.value = myInfo?.name || '';
    renameModal.classList.add('active');
    setTimeout(() => {
        newNameInput.focus();
        newNameInput.select();
    }, 50);
});

cancelRenameBtn.addEventListener('click', () => {
    renameModal.classList.remove('active');
});

renameModal.addEventListener('click', (e) => {
    if (e.target === renameModal) {
        renameModal.classList.remove('active');
    }
});

renameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = newNameInput.value.trim().substring(0, 50);
    if (newName && newName !== myInfo?.name) {
        localStorage.setItem('localchat_display_name', newName);
        socket.emit('change name', newName);
    }
    renameModal.classList.remove('active');
});

// Quản lý phòng & QR mời bạn (Hỗ trợ mạng trường nhiều tầng / Multi-WAN)
function openRoomModal() {
    renderRoomModalUI();
    roomCodeInput.value = currentRoomCode || '';
    roomModal.classList.add('active');
}

function closeRoomModal() {
    roomModal.classList.remove('active');
}

if (openRoomModalBtn) {
    openRoomModalBtn.addEventListener('click', openRoomModal);
}
if (closeRoomModalBtn) {
    closeRoomModalBtn.addEventListener('click', closeRoomModal);
}
if (cancelRoomBtn) {
    cancelRoomBtn.addEventListener('click', closeRoomModal);
}
if (roomModal) {
    roomModal.addEventListener('click', (e) => {
        if (e.target === roomModal) {
            closeRoomModal();
        }
    });
}

if (randomRoomBtn) {
    randomRoomBtn.addEventListener('click', () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        roomCodeInput.value = code;
        switchRoom(code);
    });
}

if (autoRoomBtn) {
    autoRoomBtn.addEventListener('click', () => {
        roomCodeInput.value = '';
        switchRoom('');
        closeRoomModal();
    });
}

if (copyRoomLinkBtn) {
    copyRoomLinkBtn.addEventListener('click', async () => {
        const activeCode = (myInfo && myInfo.roomMode === 'custom' && myInfo.roomCode) || currentRoomCode;
        if (!activeCode) return;
        const inviteUrl = buildRoomInviteUrl(activeCode);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(inviteUrl);
            } else {
                const tempInput = document.createElement('input');
                tempInput.value = inviteUrl;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
            }
            const originalHtml = copyRoomLinkBtn.innerHTML;
            copyRoomLinkBtn.innerHTML = '<i class="ph ph-check"></i> Đã sao chép!';
            setTimeout(() => {
                copyRoomLinkBtn.innerHTML = originalHtml;
            }, 1800);
        } catch (e) {
            alert(`Link mời vào phòng: ${inviteUrl}`);
        }
    });
}

if (roomJoinForm) {
    roomJoinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawCode = roomCodeInput.value;
        const normalized = normalizeRoomCode(rawCode);
        if (!normalized) {
            alert('Mã phòng cần ít nhất 2 ký tự (chữ cái, số, - hoặc _).');
            return;
        }
        switchRoom(normalized);
        closeRoomModal();
    });
}

// Phím ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        renameModal.classList.remove('active');
        imageModal.classList.remove('active');
        closeRoomModal();
        if (messageSearchContainer.style.display !== 'none') {
            closeMsgSearchBtn.click();
        }
    }
});

// Tìm kiếm người dùng
userSearchInput.addEventListener('input', () => {
    updateSidebar();
});

clearUserSearchBtn.addEventListener('click', () => {
    userSearchInput.value = '';
    updateSidebar();
    userSearchInput.focus();
});

// Tìm kiếm tin nhắn
toggleMsgSearchBtn.addEventListener('click', () => {
    toggleMsgSearchBtn.style.display = 'none';
    messageSearchContainer.style.display = 'flex';
    messageSearchInput.focus();
});

closeMsgSearchBtn.addEventListener('click', () => {
    messageSearchContainer.style.display = 'none';
    toggleMsgSearchBtn.style.display = 'block';
    messageSearchInput.value = '';
    msgSearchQuery = '';
    renderChatHistory();
});

messageSearchInput.addEventListener('input', (e) => {
    msgSearchQuery = e.target.value.toLowerCase().trim();
    renderChatHistory();
});

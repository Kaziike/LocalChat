const socket = io();

// =========================================================
// DEVICE IDENTITY (Cố định danh tính thiết bị qua mọi phiên)
// =========================================================
function getOrCreateDeviceId() {
    let id = localStorage.getItem('localchat_device_id');
    if (!id) {
        id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('localchat_device_id', id);
    }
    return id;
}
const myDeviceId = getOrCreateDeviceId();

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
const togglePinnedBtn = document.getElementById('toggle-pinned-btn');
const pinnedCaretIcon = document.getElementById('pinned-caret-icon');

// Call Buttons
const voiceCallBtn = document.getElementById('voice-call-btn');
const videoCallBtn = document.getElementById('video-call-btn');

// Connection Status UI
const connectionStatus = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');

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

// Image Modal UI
const imageModal = document.getElementById('image-modal');
const imageModalImg = document.getElementById('image-modal-img');
const imageModalTitle = document.getElementById('image-modal-title');
const imageModalDownload = document.getElementById('image-modal-download');
const imageModalClose = document.getElementById('image-modal-close');

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
const seenMessageIds = new Set();
const restoredFileUrls = {}; // fileId -> objectUrl

// --- WebRTC State ---
const peerConnections = {}; // targetId -> RTCPeerConnection (DataChannel)
const dataChannels = {};    // targetId -> RTCDataChannel
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
    ]
};

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

async function saveFileToIndexedDB(fileId, name, size, blob, timestamp) {
    if (!dbInstance || !fileId || !blob) return;
    try {
        const tx = dbInstance.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        store.put({
            id: fileId,
            name: name,
            size: size,
            blob: blob,
            timestamp: timestamp
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
                if (rec.id && rec.blob) {
                    try {
                        const url = URL.createObjectURL(rec.blob);
                        restoredFileUrls[rec.id] = url;
                    } catch (e) {
                        // Bỏ qua nếu blob bị hỏng
                    }
                }
            });
            renderChatHistory();
        };
    } catch (e) {
        console.warn('Lỗi đọc IndexedDB:', e);
    }
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

function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

// Notification chime via Web Audio API
function playNotificationSound() {
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
function loadPersistedHistory() {
    try {
        const saved = localStorage.getItem('localchat_history_v1');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                Object.keys(parsed).forEach(k => {
                    if (Array.isArray(parsed[k])) {
                        chatHistory[k] = parsed[k].slice(-50).map(m => ({
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
            toSave[k] = (chatHistory[k] || []).slice(-50).map(m => {
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
// SOCKET EVENTS (Signaling & Lifecycle)
// =========================================================
socket.on('connect', () => {
    connectionStatus.className = 'connection-status online';
    statusText.textContent = 'Trực tuyến';
});

socket.on('disconnect', () => {
    connectionStatus.className = 'connection-status offline';
    statusText.textContent = 'Mất kết nối';
    currentChatSubtitle.textContent = 'Mất kết nối';
    if (currentCall) {
        endCurrentCall();
    }
});

socket.on('your info', (info) => {
    myInfo = info;
    myDisplayName.textContent = info.name;
    myIpLabel.textContent = info.ip ? `IP: ${info.ip}` : '';

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

                            saveFileToIndexedDB(fileData.id, fileData.name, fileData.size, blob, fileData.timestamp);
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

    if (currentActiveChat === targetChat) {
        renderMessage(msg);
        scrollToBottom();
    } else {
        unreadCounts[targetChat] = (unreadCounts[targetChat] || 0) + 1;
        playNotificationSound();
        updateTabTitle();
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

async function sendFile(file, toChat) {
    if (!file) return;

    if (toChat !== 'general' && (!dataChannels[toChat] || dataChannels[toChat].readyState !== 'open')) {
        alert('Đang chờ kết nối P2P tới người nhận. Vui lòng thử lại sau 2 giây.');
        return;
    }

    const timestamp = new Date().toISOString();
    const fileId = generateId();

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
    } catch (e) {
        console.error('Lỗi gửi file:', e);
        alert('Có lỗi xảy ra khi truyền file.');
        hideTransferProgress();
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
}

function updateChatHeader() {
    updateCallUIButtons();

    if (currentActiveChat === 'general') {
        currentChatName.textContent = 'Nhóm chung nội bộ';
        currentChatAvatar.innerHTML = `<i class="ph-fill ph-users-three"></i>`;
        pinnedMessageContainer.style.display = 'flex';

        const count = users.length;
        if (count <= 1) {
            currentChatSubtitle.textContent = '1 người (Đợi thiết bị khác)';
        } else {
            currentChatSubtitle.textContent = `${count} thành viên Wi-Fi`;
        }
    } else {
        const user = users.find(u => u.id === currentActiveChat);
        pinnedMessageContainer.style.display = 'none';

        if (user) {
            currentChatName.textContent = user.name;
            currentChatAvatar.innerHTML = `<i class="ph-fill ph-user"></i>`;
            const isP2pReady = dataChannels[user.id] && dataChannels[user.id].readyState === 'open';
            currentChatSubtitle.textContent = isP2pReady ? 'Trực tuyến (P2P)' : 'Trực tuyến';
        } else {
            currentChatName.textContent = 'Người dùng đã rời mạng';
            currentChatAvatar.innerHTML = `<i class="ph-fill ph-user-minus"></i>`;
            currentChatSubtitle.textContent = 'Offline';
            voiceCallBtn.style.display = 'none';
            videoCallBtn.style.display = 'none';
        }
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
    updateChatHeader();
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

        const validFileUrl = msg.fileUrl || restoredFileUrls[msg.id];

        if (isImg && validFileUrl) {
            contentHtml = `
                <div class="msg-image-wrap" onclick="openImageModal('${escapeHtml(validFileUrl)}', '${safeFileName}')">
                    <img src="${escapeHtml(validFileUrl)}" alt="${safeFileName}" class="msg-image-preview">
                </div>
                <a href="${escapeHtml(validFileUrl)}" target="_blank" download="${safeFileName}" class="msg-file">
                    <i class="ph-fill ph-file-image"></i>
                    <div class="file-info">
                        <span class="file-name">${safeFileName}</span>
                        <span class="file-size">${formattedSize}</span>
                    </div>
                </a>
            `;
        } else if (validFileUrl) {
            contentHtml = `
                <a href="${escapeHtml(validFileUrl)}" target="_blank" download="${safeFileName}" class="msg-file">
                    <i class="ph-fill ph-file-doc"></i>
                    <div class="file-info">
                        <span class="file-name">${safeFileName}</span>
                        <span class="file-size">${formattedSize}</span>
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

    msgDiv.innerHTML = `
        <div class="avatar">
            <i class="ph-fill ph-user"></i>
        </div>
        <div class="msg-content-wrapper">
            <span class="msg-sender">${senderName}</span>
            <div class="msg-bubble ${isHighlighted ? 'highlighted' : ''}">
                ${contentHtml}
                <span class="msg-time">${escapeHtml(formatTime(msg.timestamp))}</span>
            </div>
        </div>
    `;

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

// Nút quay lại trên Mobile (Trở về danh sách Zalo)
mobileBackBtn.addEventListener('click', () => {
    appContainer.classList.remove('show-chat');
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

// Phím ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        renameModal.classList.remove('active');
        imageModal.classList.remove('active');
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

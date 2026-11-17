const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', true);

const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e8, // 100MB
    pingInterval: 15000,
    pingTimeout: 25000,
    cors: {
        origin: true,
        credentials: true
    }
});

const PORT = process.env.PORT || 3000;

// Thư mục lưu tạm file relay khi WebRTC DataChannel bị chặn bởi Firewall / AP Isolation
const RELAY_UPLOAD_DIR = path.join(os.tmpdir(), 'localchat-relay-uploads');
const RELAY_TTL_MS = 15 * 60 * 1000; // Tự động xóa sau 15 phút
const MAX_RELAY_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const DISCONNECT_GRACE_MS = 4000; // Chờ 4s trước khi xóa user khỏi phòng để chống chớp tắt trên iOS/Wi-Fi

if (!fs.existsSync(RELAY_UPLOAD_DIR)) {
    fs.mkdirSync(RELAY_UPLOAD_DIR, { recursive: true });
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Tối đa 10MB mỗi chunk (an toàn dưới ngưỡng 100MB Cloudflare)
});

app.use(express.static(path.join(__dirname, '..'), {
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=UTF-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// Quản lý các phòng (Rooms) và định danh thiết bị bền vững (deviceId)
const rooms = {}; // roomId -> { [userId]: { id, socketId, name, ip, connectedAt } }
const pendingDisconnectTimers = new Map(); // `${roomId}:${userId}` -> Timeout
const pendingTransfers = new Map(); // transferId -> { tempPath, receivedChunks, totalChunks, totalBytes, fileName, fileSize, mimeType, roomId, createdAt }
const relayFiles = new Map(); // fileId -> { filePath, fileName, fileSize, mimeType, roomId, createdAt }
const roomPinnedMessages = new Map(); // roomId -> { text, updatedBy, updatedAt }

function sanitizePinnedMessage(rawText) {
    if (typeof rawText !== 'string') return '';
    return rawText.replace(/[\r\n]+/g, ' ').trim().substring(0, 300);
}

/**
 * Chuẩn hóa mã phòng tùy chọn do người dùng nhập hoặc từ URL (?room=...).
 */
function normalizeRoomCode(code) {
    if (typeof code !== 'string') return '';
    const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').substring(0, 32);
    return cleaned.length >= 2 ? cleaned : '';
}

/**
 * Trích xuất IP thực của thiết bị, ưu tiên header Cloudflare / Reverse Proxy.
 */
function getDeviceIP(socket) {
    const headers = (socket && socket.handshake && socket.handshake.headers) || {};
    let ip =
        headers['cf-connecting-ip'] ||
        headers['true-client-ip'] ||
        headers['x-forwarded-for'] ||
        (socket && socket.handshake && socket.handshake.address);

    if (typeof ip !== 'string' || !ip.trim()) return '127.0.0.1';
    if (ip.includes(',')) ip = ip.split(',')[0];
    ip = ip.trim();

    if (ip.startsWith('::ffff:')) ip = ip.substring(7);
    if (ip === '::1') ip = '127.0.0.1';

    // Bỏ cổng kèm theo nếu ở dạng IPv4:port (VD: 192.168.1.5:51234)
    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
        ip = ip.split(':')[0];
    }
    // Bỏ ngoặc vuông và cổng nếu ở dạng [IPv6]:port
    const bracketMatch = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
    if (bracketMatch) {
        ip = bracketMatch[1];
    }

    return ip.trim() || '127.0.0.1';
}

/**
 * Chuẩn hóa IPv6 (bao gồm dạng rút gọn '::') về đủ 8 cụm 16-bit để lấy prefix /64 chính xác.
 */
function expandIPv6(ip) {
    if (typeof ip !== 'string' || !ip.includes(':')) return '';
    const clean = ip.split('%')[0].toLowerCase().trim();

    // Trường hợp chứa '::'
    const parts = clean.split('::');
    if (parts.length > 2) return '';

    let blocks = [];
    if (parts.length === 2) {
        const left = parts[0] ? parts[0].split(':') : [];
        const right = parts[1] ? parts[1].split(':') : [];
        const missing = 8 - (left.length + right.length);
        if (missing < 0) return '';
        blocks = [...left, ...Array(missing).fill('0'), ...right];
    } else {
        blocks = clean.split(':');
        if (blocks.length !== 8) return '';
    }

    return blocks.map(b => b.padStart(4, '0')).join(':');
}

function isPrivateOrLocalIPv4(ip) {
    return (
        ip === '127.0.0.1' ||
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
        ip.startsWith('169.254.')
    );
}

/**
 * Xác định thông tin phòng dựa trên mã phòng tùy chọn (nếu có) hoặc dải mạng IP.
 */
function getRoomMetadata(ip, customRoomCode = '') {
    const normalizedCode = normalizeRoomCode(customRoomCode);
    if (normalizedCode) {
        return {
            roomId: `ROOM-${normalizedCode}`,
            roomMode: 'custom',
            roomCode: normalizedCode,
            roomDisplayName: `Phòng ${normalizedCode}`
        };
    }

    if (!ip || typeof ip !== 'string') {
        return {
            roomId: 'LAN-Network',
            roomMode: 'lan',
            roomCode: '',
            roomDisplayName: 'Mạng nội bộ (LAN)'
        };
    }

    if (isPrivateOrLocalIPv4(ip)) {
        return {
            roomId: 'LAN-Network',
            roomMode: 'lan',
            roomCode: '',
            roomDisplayName: 'Mạng nội bộ (LAN)'
        };
    }

    if (ip.includes(':')) {
        const expanded = expandIPv6(ip);
        if (expanded) {
            const prefix64 = expanded.split(':').slice(0, 4).join(':');
            return {
                roomId: `IPv6-Network-${prefix64}`,
                roomMode: 'ipv6-prefix',
                roomCode: '',
                roomDisplayName: `IPv6 (${prefix64}::/64)`
            };
        }
        return {
            roomId: `IPv6-Network-${ip}`,
            roomMode: 'ipv6-prefix',
            roomCode: '',
            roomDisplayName: `IPv6 (${ip})`
        };
    }

    // Gom IPv4 Public / CGNAT theo dải /24 để các thiết bị cùng NAT pool (VD: .144 và .149) tự động vào chung phòng
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        const subnet24 = ip.split('.').slice(0, 3).join('.');
        return {
            roomId: `Public-${subnet24}`,
            roomMode: 'ipv4-subnet',
            roomCode: '',
            roomDisplayName: `Dải ${subnet24}.x`
        };
    }

    return {
        roomId: ip,
        roomMode: 'ip',
        roomCode: '',
        roomDisplayName: ip
    };
}

function getRoomId(ip, customRoomCode = '') {
    return getRoomMetadata(ip, customRoomCode).roomId;
}

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name] || []) {
            if (net.family === 'IPv4' && !net.internal) {
                addresses.push({ name, address: net.address });
            }
        }
    }
    return addresses;
}

function getSanitizedDeviceId(socket) {
    const raw = socket && socket.handshake && socket.handshake.auth && socket.handshake.auth.deviceId;
    if (typeof raw === 'string') {
        const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
        if (cleaned.length >= 6) return cleaned;
    }
    return socket.id;
}

function getSanitizedName(rawName, fallbackIp) {
    if (typeof rawName === 'string') {
        const clean = rawName.trim().substring(0, 50);
        if (clean) return clean;
    }
    return fallbackIp;
}

function getPublicRoomUsers(roomId) {
    const room = rooms[roomId];
    if (!room) return [];
    return Object.values(room).map(({ id, name, ip }) => ({ id, name, ip }));
}

function emitToUserInRoom(roomId, targetUserId, eventName, payload) {
    const targetUser = rooms[roomId] && rooms[roomId][targetUserId];
    if (targetUser && targetUser.socketId) {
        io.to(targetUser.socketId).emit(eventName, payload);
        return true;
    }
    return false;
}

function clearPendingDisconnect(roomId, userId) {
    const key = `${roomId}:${userId}`;
    const timer = pendingDisconnectTimers.get(key);
    if (timer) {
        clearTimeout(timer);
        pendingDisconnectTimers.delete(key);
    }
}

function removeUserFromRoom(roomId, userId) {
    clearPendingDisconnect(roomId, userId);
    if (rooms[roomId] && rooms[roomId][userId]) {
        delete rooms[roomId][userId];
        io.to(roomId).emit('user list', getPublicRoomUsers(roomId));
        if (Object.keys(rooms[roomId]).length === 0) {
            delete rooms[roomId];
        }
    }
}

/**
 * Xây dựng cấu hình ICE Servers (STUN mặc định + TURN tùy chọn qua biến môi trường).
 */
function buildIceConfig() {
    const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
    ];

    const turnUrlsRaw = process.env.TURN_URLS || process.env.TURN_URL || '';
    if (turnUrlsRaw.trim()) {
        const urls = turnUrlsRaw
            .split(',')
            .map(u => u.trim())
            .filter(Boolean);
        if (urls.length > 0) {
            const turnEntry = { urls };
            if (process.env.TURN_USERNAME) turnEntry.username = process.env.TURN_USERNAME;
            if (process.env.TURN_CREDENTIAL || process.env.TURN_PASS) {
                turnEntry.credential = process.env.TURN_CREDENTIAL || process.env.TURN_PASS;
            }
            iceServers.push(turnEntry);
        }
    }

    return { iceServers };
}

// =========================================================
// HTTP API: ICE/TURN CONFIG & FALLBACK CHUNKED FILE RELAY
// =========================================================
app.get('/api/ice-config', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(buildIceConfig());
});

app.post('/api/relay/upload-chunk', upload.single('chunk'), async (req, res) => {
    try {
        const {
            transferId,
            chunkIndex: chunkIdxRaw,
            totalChunks: totalChunksRaw,
            fileName,
            fileSize: fileSizeRaw,
            mimeType,
            roomId,
            senderId,
            targetId,
            messageId,
            timestamp
        } = req.body || {};

        if (!req.file || typeof transferId !== 'string' || !/^[a-zA-Z0-9_-]{8,64}$/.test(transferId)) {
            return res.status(400).json({ ok: false, error: 'Thiếu dữ liệu mảnh hoặc transferId không hợp lệ.' });
        }

        if (!roomId || !senderId || !rooms[roomId] || !rooms[roomId][senderId]) {
            return res.status(403).json({ ok: false, error: 'Thiết bị không thuộc phòng hợp lệ.' });
        }

        const chunkIndex = parseInt(chunkIdxRaw, 10);
        const totalChunks = parseInt(totalChunksRaw, 10);
        const declaredSize = parseInt(fileSizeRaw, 10) || 0;

        if (
            isNaN(chunkIndex) || isNaN(totalChunks) ||
            chunkIndex < 0 || totalChunks < 1 || totalChunks > 1000 || chunkIndex >= totalChunks
        ) {
            return res.status(400).json({ ok: false, error: 'Chỉ số chunk không hợp lệ.' });
        }

        if (declaredSize > MAX_RELAY_FILE_SIZE) {
            return res.status(413).json({ ok: false, error: 'Tập tin vượt quá giới hạn 500MB.' });
        }

        let transfer = pendingTransfers.get(transferId);
        if (chunkIndex === 0) {
            const tempPath = path.join(RELAY_UPLOAD_DIR, `${transferId}.part`);
            await fs.promises.writeFile(tempPath, req.file.buffer);
            transfer = {
                tempPath,
                receivedChunks: 1,
                totalChunks,
                totalBytes: req.file.buffer.length,
                fileName: (typeof fileName === 'string' && fileName.trim()) ? fileName.trim().substring(0, 255) : 'tap-tin',
                fileSize: declaredSize || req.file.buffer.length,
                mimeType: (typeof mimeType === 'string' && mimeType) ? mimeType : 'application/octet-stream',
                roomId,
                senderId,
                createdAt: Date.now()
            };
            pendingTransfers.set(transferId, transfer);
        } else {
            if (!transfer || transfer.roomId !== roomId || transfer.senderId !== senderId) {
                return res.status(400).json({ ok: false, error: 'Phiên truyền tải không tồn tại hoặc không khớp.' });
            }
            if (chunkIndex !== transfer.receivedChunks) {
                return res.status(409).json({ ok: false, error: 'Thứ tự mảnh không khớp.' });
            }
            if (transfer.totalBytes + req.file.buffer.length > MAX_RELAY_FILE_SIZE) {
                return res.status(413).json({ ok: false, error: 'Tập tin vượt quá giới hạn 500MB.' });
            }
            await fs.promises.appendFile(transfer.tempPath, req.file.buffer);
            transfer.receivedChunks += 1;
            transfer.totalBytes += req.file.buffer.length;
        }

        if (transfer.receivedChunks < transfer.totalChunks) {
            return res.json({ ok: true, completed: false, receivedChunks: transfer.receivedChunks });
        }

        // Hoàn tất nhận đủ các mảnh
        const finalPath = path.join(RELAY_UPLOAD_DIR, `${transferId}.bin`);
        await fs.promises.rename(transfer.tempPath, finalPath);
        pendingTransfers.delete(transferId);

        relayFiles.set(transferId, {
            filePath: finalPath,
            fileName: transfer.fileName,
            fileSize: transfer.totalBytes,
            mimeType: transfer.mimeType,
            roomId,
            createdAt: Date.now()
        });

        const relayFileUrl = `/api/relay/file/${transferId}`;
        const senderUser = rooms[roomId][senderId];
        const senderInfo = { id: senderUser.id, name: senderUser.name, ip: senderUser.ip };
        const relayPayload = {
            id: messageId || transferId,
            senderDeviceId: senderId,
            from: senderInfo,
            to: targetId || 'general',
            content: '',
            isFile: true,
            fileName: transfer.fileName,
            fileSize: transfer.totalBytes,
            mimeType: transfer.mimeType,
            relayFileUrl,
            timestamp: timestamp || new Date().toISOString()
        };

        if (relayPayload.to === 'general') {
            Object.values(rooms[roomId]).forEach(member => {
                if (member.id !== senderId && member.socketId) {
                    io.to(member.socketId).emit('relay_message', relayPayload);
                }
            });
        } else {
            emitToUserInRoom(roomId, relayPayload.to, 'relay_message', relayPayload);
        }

        return res.json({
            ok: true,
            completed: true,
            fileId: transferId,
            fileUrl: relayFileUrl
        });
    } catch (err) {
        console.error('[Relay Upload Error]', err);
        return res.status(500).json({ ok: false, error: 'Lỗi máy chủ khi tiếp nhận tập tin.' });
    }
});

app.get('/api/relay/file/:fileId', (req, res) => {
    const fileId = req.params.fileId;
    if (!fileId || !/^[a-zA-Z0-9_-]{8,64}$/.test(fileId)) {
        return res.status(400).send('Invalid file ID');
    }

    const meta = relayFiles.get(fileId);
    if (!meta || !fs.existsSync(meta.filePath)) {
        return res.status(404).send('File expired or not found');
    }

    const encodedName = encodeURIComponent(meta.fileName);
    const asciiFallback = meta.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`
    );
    res.setHeader('Cache-Control', 'no-store');

    const stream = fs.createReadStream(meta.filePath);
    stream.on('error', () => {
        if (!res.headersSent) res.status(500).send('Read error');
    });
    stream.pipe(res);
});

// Dọn dẹp định kỳ các file tạm quá hạn
function cleanupExpiredRelayFiles() {
    const now = Date.now();
    for (const [id, meta] of relayFiles.entries()) {
        if (now - meta.createdAt > RELAY_TTL_MS) {
            relayFiles.delete(id);
            fs.promises.unlink(meta.filePath).catch(() => {});
        }
    }
    for (const [id, transfer] of pendingTransfers.entries()) {
        if (now - transfer.createdAt > RELAY_TTL_MS) {
            pendingTransfers.delete(id);
            fs.promises.unlink(transfer.tempPath).catch(() => {});
        }
    }
}
const cleanupInterval = setInterval(cleanupExpiredRelayFiles, 60 * 1000);
cleanupInterval.unref();

// =========================================================
// SOCKET.IO SIGNALING & ROOM MANAGEMENT
// =========================================================
io.on('connection', (socket) => {
    const ip = getDeviceIP(socket);
    const userId = getSanitizedDeviceId(socket);
    const initialRoomCode = socket.handshake.auth && socket.handshake.auth.roomCode;
    const initialName = socket.handshake.auth && socket.handshake.auth.name;

    let roomMeta = getRoomMetadata(ip, initialRoomCode);
    let currentRoomId = roomMeta.roomId;

    function joinRoom(meta, preferredName) {
        currentRoomId = meta.roomId;
        roomMeta = meta;

        clearPendingDisconnect(currentRoomId, userId);

        if (!rooms[currentRoomId]) {
            rooms[currentRoomId] = {};
        }

        const existing = rooms[currentRoomId][userId];
        const resolvedName = getSanitizedName(preferredName || (existing && existing.name), ip);

        rooms[currentRoomId][userId] = {
            id: userId,
            socketId: socket.id,
            name: resolvedName,
            ip: ip,
            connectedAt: Date.now()
        };

        socket.join(currentRoomId);

        socket.emit('your info', {
            id: userId,
            name: resolvedName,
            ip: ip,
            roomId: roomMeta.roomId,
            roomMode: roomMeta.roomMode,
            roomCode: roomMeta.roomCode,
            roomDisplayName: roomMeta.roomDisplayName
        });

        const roomPinned = roomPinnedMessages.get(currentRoomId);
        if (roomPinned) {
            socket.emit('pinned_message_update', {
                chatScope: 'general',
                text: roomPinned.text,
                updatedBy: roomPinned.updatedBy,
                updatedAt: roomPinned.updatedAt
            });
        }

        io.to(currentRoomId).emit('user list', getPublicRoomUsers(currentRoomId));
    }

    console.log(`[Kết nối] Device: ${userId} | Socket: ${socket.id} | IP: ${ip} | Phòng: ${currentRoomId}`);
    joinRoom(roomMeta, initialName);

    // Cho phép chuyển phòng ngay trong phiên (Vào phòng bằng mã hoặc quay lại tự động theo mạng)
    socket.on('switch_room', (payload, callback) => {
        const nextCode = payload && typeof payload.roomCode === 'string' ? payload.roomCode : '';
        const nextMeta = getRoomMetadata(ip, nextCode);
        const currentUserName = (rooms[currentRoomId] && rooms[currentRoomId][userId] && rooms[currentRoomId][userId].name) || ip;

        if (nextMeta.roomId !== currentRoomId) {
            const oldRoomId = currentRoomId;
            socket.leave(oldRoomId);
            if (rooms[oldRoomId] && rooms[oldRoomId][userId] && rooms[oldRoomId][userId].socketId === socket.id) {
                removeUserFromRoom(oldRoomId, userId);
            }
            console.log(`[Chuyển phòng] Device: ${userId} | ${oldRoomId} -> ${nextMeta.roomId}`);
            joinRoom(nextMeta, currentUserName);
        } else {
            socket.emit('your info', {
                id: userId,
                name: currentUserName,
                ip: ip,
                roomId: roomMeta.roomId,
                roomMode: roomMeta.roomMode,
                roomCode: roomMeta.roomCode,
                roomDisplayName: roomMeta.roomDisplayName
            });
        }

        if (typeof callback === 'function') {
            callback({
                ok: true,
                roomId: roomMeta.roomId,
                roomMode: roomMeta.roomMode,
                roomCode: roomMeta.roomCode,
                roomDisplayName: roomMeta.roomDisplayName
            });
        }
    });

    socket.on('change name', (newName) => {
        if (rooms[currentRoomId] && rooms[currentRoomId][userId]) {
            const cleanName = getSanitizedName(newName, ip);
            rooms[currentRoomId][userId].name = cleanName;
            io.to(currentRoomId).emit('user list', getPublicRoomUsers(currentRoomId));
            socket.emit('your info', {
                id: userId,
                name: cleanName,
                ip: ip,
                roomId: roomMeta.roomId,
                roomMode: roomMeta.roomMode,
                roomCode: roomMeta.roomCode,
                roomDisplayName: roomMeta.roomDisplayName
            });
        }
    });

    // Đồng bộ tin nhắn ghim trong nhóm chung hoặc đoạn chat 1-1
    socket.on('update_pinned_message', (payload) => {
        if (!payload || !payload.chatScope) return;
        const userObj = rooms[currentRoomId] && rooms[currentRoomId][userId];
        const senderName = (userObj && userObj.name) || ip;
        const cleanText = payload.resetDefault ? null : sanitizePinnedMessage(payload.text || '');
        const updatedAt = new Date().toISOString();

        if (payload.chatScope === 'general') {
            if (payload.resetDefault) {
                roomPinnedMessages.delete(currentRoomId);
            } else {
                roomPinnedMessages.set(currentRoomId, {
                    text: cleanText,
                    updatedBy: senderName,
                    updatedAt
                });
            }
            io.to(currentRoomId).emit('pinned_message_update', {
                chatScope: 'general',
                text: cleanText,
                resetDefault: !!payload.resetDefault,
                updatedBy: senderName,
                updatedAt
            });
        } else {
            const targetId = String(payload.chatScope);
            emitToUserInRoom(currentRoomId, targetId, 'pinned_message_update', {
                chatScope: userId,
                text: cleanText,
                updatedBy: senderName,
                updatedAt
            });
            socket.emit('pinned_message_update', {
                chatScope: targetId,
                text: cleanText,
                updatedBy: senderName,
                updatedAt
            });
        }
    });

    // WebRTC Signaling cho DataChannel (Chat & Tệp tin)
    socket.on('webrtc_offer', (data) => {
        if (!data || !data.target) return;
        emitToUserInRoom(currentRoomId, data.target, 'webrtc_offer', {
            sender: userId,
            offer: data.offer
        });
    });

    socket.on('webrtc_answer', (data) => {
        if (!data || !data.target) return;
        emitToUserInRoom(currentRoomId, data.target, 'webrtc_answer', {
            sender: userId,
            answer: data.answer
        });
    });

    socket.on('webrtc_ice_candidate', (data) => {
        if (!data || !data.target) return;
        emitToUserInRoom(currentRoomId, data.target, 'webrtc_ice_candidate', {
            sender: userId,
            candidate: data.candidate
        });
    });

    // Cơ chế Fallback tin nhắn qua Socket.IO khi WebRTC DataChannel bị chặn bởi Router/NAT
    socket.on('relay_message', (payload) => {
        if (!payload || !payload.to) return;
        const userObj = rooms[currentRoomId] && rooms[currentRoomId][userId];
        const senderInfo = userObj
            ? { id: userObj.id, name: userObj.name, ip: userObj.ip }
            : { id: userId, name: userId, ip };

        const relayData = {
            ...payload,
            senderDeviceId: userId,
            from: senderInfo
        };

        if (payload.to === 'general') {
            socket.to(currentRoomId).emit('relay_message', relayData);
        } else {
            emitToUserInRoom(currentRoomId, payload.to, 'relay_message', relayData);
        }
    });

    // --- WebRTC Media Call Signaling (Gọi thoại & Gọi video nội bộ P2P) ---
    socket.on('call_user', (data) => {
        if (!data || !data.target) return;
        const userObj = rooms[currentRoomId] && rooms[currentRoomId][userId];
        const callerInfo = userObj
            ? { id: userObj.id, name: userObj.name, ip: userObj.ip }
            : { id: userId, name: userId, ip };

        emitToUserInRoom(currentRoomId, data.target, 'call_incoming', {
            caller: callerInfo,
            isVideo: !!data.isVideo
        });
    });

    socket.on('call_accepted', (data) => {
        if (!data || !data.target) return;
        emitToUserInRoom(currentRoomId, data.target, 'call_accepted', {
            target: userId,
            isVideo: !!data.isVideo
        });
    });

    socket.on('call_rejected', (data) => {
        if (!data || !data.target) return;
        emitToUserInRoom(currentRoomId, data.target, 'call_rejected', {
            target: userId
        });
    });

    socket.on('call_ended', (data) => {
        if (!data || !data.target) return;
        emitToUserInRoom(currentRoomId, data.target, 'call_ended', {
            target: userId
        });
    });

    socket.on('call_signal', (data) => {
        if (!data || !data.target) return;
        emitToUserInRoom(currentRoomId, data.target, 'call_signal', {
            sender: userId,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        console.log(`[Ngắt kết nối] Device: ${userId} | Socket: ${socket.id}`);
        const room = rooms[currentRoomId];
        if (!room || !room[userId] || room[userId].socketId !== socket.id) {
            return;
        }

        const disconnectedRoomId = currentRoomId;
        const disconnectedSocketId = socket.id;
        clearPendingDisconnect(disconnectedRoomId, userId);

        const timer = setTimeout(() => {
            pendingDisconnectTimers.delete(`${disconnectedRoomId}:${userId}`);
            const latestRoom = rooms[disconnectedRoomId];
            if (latestRoom && latestRoom[userId] && latestRoom[userId].socketId === disconnectedSocketId) {
                removeUserFromRoom(disconnectedRoomId, userId);
            }
        }, DISCONNECT_GRACE_MS);

        if (typeof timer.unref === 'function') {
            timer.unref();
        }
        pendingDisconnectTimers.set(`${disconnectedRoomId}:${userId}`, timer);
    });
});

if (require.main === module) {
    server.listen(PORT, '0.0.0.0', () => {
        const localIPs = getLocalIPs();
        console.log('====================================================================');
        console.log(`  🚀 CHAT NỘI BỘ WI-FI ĐÃ KHỞI ĐỘNG TRÊN CỔNG ${PORT}`);
        console.log('====================================================================');
        console.log('  💻 Truy cập trên máy tính này:');
        console.log(`     👉 http://localhost:${PORT}`);
        console.log(`     👉 http://127.0.0.1:${PORT}`);
        if (localIPs.length > 0) {
            console.log('\n  📱 Truy cập từ điện thoại / máy khác trong cùng Wi-Fi:');
            localIPs.forEach(net => {
                console.log(`     👉 http://${net.address}:${PORT} (${net.name})`);
            });
        }
        console.log('====================================================================\n');
    });
}

module.exports = {
    app,
    server,
    io,
    getDeviceIP,
    getRoomId,
    getRoomMetadata,
    expandIPv6,
    normalizeRoomCode,
    getLocalIPs,
    buildIceConfig,
    sanitizePinnedMessage,
    rooms
};

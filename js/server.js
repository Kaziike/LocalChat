const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e8 // 100MB
});

const PORT = process.env.PORT || 3000;

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

// Quản lý các phòng (Rooms)
// Nếu dùng chung Public IP (cùng mạng Wi-Fi ra internet) -> Chung phòng.
// Nếu truy cập bằng Local IP (192.168.x.x) -> Chung phòng mạng nội bộ.
const rooms = {};

function getDeviceIP(socket) {
    let ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (typeof ip !== 'string') return '127.0.0.1';
    if (ip.includes(',')) ip = ip.split(',')[0];
    if (ip.startsWith('::ffff:')) ip = ip.substring(7);
    if (ip === '::1') ip = '127.0.0.1';
    return ip.trim();
}

function getRoomId(ip) {
    if (!ip || typeof ip !== 'string') return 'LAN-Network';

    // Nhận diện dải IP nội bộ (LAN) cho IPv4
    const isLocal = ip === '127.0.0.1' || 
                    ip.startsWith('192.168.') || 
                    ip.startsWith('10.') || 
                    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
    
    if (isLocal) {
        return 'LAN-Network';
    }

    // Xử lý IPv6 (Ví dụ: mạng Viettel/VNPT dùng IPv6)
    // Trong IPv6, các thiết bị chung Wi-Fi sẽ có ĐỊA CHỈ KHÁC NHAU hoàn toàn.
    // NHƯNG chúng sẽ CHUNG DẢI MẠNG (Prefix /64) gồm 4 cụm đầu tiên.
    // Nên ta sẽ gom nhóm phòng theo 4 cụm đầu của IPv6 thay vì toàn bộ IP.
    if (ip.includes(':')) {
        const blocks = ip.split(':');
        if (blocks.length >= 4) {
            return 'IPv6-Network-' + blocks.slice(0, 4).join(':');
        }
    }
    
    return ip; // Với IPv4 Public (ngrok), lấy chính IP đó làm tên phòng
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

io.on('connection', (socket) => {
    const ip = getDeviceIP(socket);
    const roomId = getRoomId(ip);
    
    console.log(`[Kết nối] Socket: ${socket.id} | IP: ${ip} | Phòng: ${roomId}`);
    
    const userName = ip;
    
    if (!rooms[roomId]) {
        rooms[roomId] = {};
    }
    
    rooms[roomId][socket.id] = { id: socket.id, name: userName, ip: ip };
    socket.join(roomId);

    // Gửi thông tin cá nhân kèm tên phòng cho client
    socket.emit('your info', {
        ...rooms[roomId][socket.id],
        roomId: roomId
    });
    
    // Chỉ phát danh sách cho những người TRONG CÙNG PHÒNG (cùng mạng)
    io.to(roomId).emit('user list', Object.values(rooms[roomId]));

    socket.on('change name', (newName) => {
        if (rooms[roomId] && rooms[roomId][socket.id]) {
            const cleanName = (typeof newName === 'string' ? newName.trim().substring(0, 50) : '') || ip;
            rooms[roomId][socket.id].name = cleanName;
            io.to(roomId).emit('user list', Object.values(rooms[roomId]));
            socket.emit('your info', {
                ...rooms[roomId][socket.id],
                roomId: roomId
            });
        }
    });

    // WebRTC Signaling cho DataChannel (Chat & Tệp tin)
    socket.on('webrtc_offer', (data) => {
        if (!data || !data.target) return;
        io.to(data.target).emit('webrtc_offer', {
            sender: socket.id,
            offer: data.offer
        });
    });

    socket.on('webrtc_answer', (data) => {
        if (!data || !data.target) return;
        io.to(data.target).emit('webrtc_answer', {
            sender: socket.id,
            answer: data.answer
        });
    });

    socket.on('webrtc_ice_candidate', (data) => {
        if (!data || !data.target) return;
        io.to(data.target).emit('webrtc_ice_candidate', {
            sender: socket.id,
            candidate: data.candidate
        });
    });

    // Cơ chế Fallback tin nhắn qua Socket.IO khi WebRTC DataChannel bị chặn bởi Router/NAT
    socket.on('relay_message', (payload) => {
        if (!payload || !payload.to) return;
        const senderInfo = rooms[roomId]?.[socket.id] || { id: socket.id, name: socket.id, ip };
        const relayData = {
            ...payload,
            from: senderInfo
        };

        if (payload.to === 'general') {
            socket.to(roomId).emit('relay_message', relayData);
        } else if (rooms[roomId]?.[payload.to]) {
            io.to(payload.to).emit('relay_message', relayData);
        }
    });

    // --- WebRTC Media Call Signaling (Gọi thoại & Gọi video nội bộ P2P) ---
    socket.on('call_user', (data) => {
        if (!data || !data.target) return;
        const callerInfo = rooms[roomId]?.[socket.id] || { id: socket.id, name: socket.id, ip };
        io.to(data.target).emit('call_incoming', {
            caller: callerInfo,
            isVideo: !!data.isVideo
        });
    });

    socket.on('call_accepted', (data) => {
        if (!data || !data.target) return;
        io.to(data.target).emit('call_accepted', {
            target: socket.id,
            isVideo: !!data.isVideo
        });
    });

    socket.on('call_rejected', (data) => {
        if (!data || !data.target) return;
        io.to(data.target).emit('call_rejected', {
            target: socket.id
        });
    });

    socket.on('call_ended', (data) => {
        if (!data || !data.target) return;
        io.to(data.target).emit('call_ended', {
            target: socket.id
        });
    });

    socket.on('call_signal', (data) => {
        if (!data || !data.target) return;
        io.to(data.target).emit('call_signal', {
            sender: socket.id,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        console.log(`[Ngắt kết nối] Socket: ${socket.id}`);
        if (rooms[roomId] && rooms[roomId][socket.id]) {
            delete rooms[roomId][socket.id];
            io.to(roomId).emit('user list', Object.values(rooms[roomId]));
            
            if (Object.keys(rooms[roomId]).length === 0) {
                delete rooms[roomId];
            }
        }
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
    getLocalIPs,
    rooms
};

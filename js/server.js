const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e8 
});

app.use(express.static(path.join(__dirname, '..')));

// Quản lý các phòng (Rooms)
// Nếu dùng chung Public IP (cùng mạng Wi-Fi ra internet) -> Chung phòng.
// Nếu truy cập bằng Local IP (192.168.x.x) -> Chung phòng mạng nội bộ.
let rooms = {};

function getDeviceIP(socket) {
    let ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (ip.includes(',')) ip = ip.split(',')[0];
    if (ip.startsWith('::ffff:')) ip = ip.substring(7);
    if (ip === '::1') ip = '127.0.0.1';
    return ip.trim();
}

function getRoomId(ip) {
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

io.on('connection', (socket) => {
    const ip = getDeviceIP(socket);
    const roomId = getRoomId(ip);
    
    console.log(`Thiết bị kết nối: ${socket.id} | IP: ${ip} | Phòng: ${roomId}`);
    
    const userName = ip;
    
    if (!rooms[roomId]) {
        rooms[roomId] = {};
    }
    
    rooms[roomId][socket.id] = { id: socket.id, name: userName, ip: ip };
    socket.join(roomId);

    socket.emit('your info', rooms[roomId][socket.id]);
    
    // Chỉ phát danh sách cho những người TRONG CÙNG PHÒNG (cùng mạng)
    io.to(roomId).emit('user list', Object.values(rooms[roomId]));

    socket.on('change name', (newName) => {
        if (rooms[roomId][socket.id]) {
            rooms[roomId][socket.id].name = newName;
            io.to(roomId).emit('user list', Object.values(rooms[roomId]));
            socket.emit('your info', rooms[roomId][socket.id]);
        }
    });

    socket.on('webrtc_offer', (data) => {
        io.to(data.target).emit('webrtc_offer', {
            sender: socket.id,
            offer: data.offer
        });
    });

    socket.on('webrtc_answer', (data) => {
        io.to(data.target).emit('webrtc_answer', {
            sender: socket.id,
            answer: data.answer
        });
    });

    socket.on('webrtc_ice_candidate', (data) => {
        io.to(data.target).emit('webrtc_ice_candidate', {
            sender: socket.id,
            candidate: data.candidate
        });
    });

    socket.on('disconnect', () => {
        console.log(`Thiết bị ngắt kết nối: ${socket.id}`);
        if (rooms[roomId] && rooms[roomId][socket.id]) {
            delete rooms[roomId][socket.id];
            io.to(roomId).emit('user list', Object.values(rooms[roomId]));
            
            if (Object.keys(rooms[roomId]).length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Máy chủ đang chạy tại http://0.0.0.0:3000');
});
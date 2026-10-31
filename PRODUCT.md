# ZaloCRM — Product Mission & Durable Context

**Version:** 3.4.1 (Impeccable Edition)  
**Target Organization:** Công ty TNHH SX TM Dệt May Vĩnh Phát (`VinhPhatERP_v3`)  
**Primary Platform:** Web B2B (Desktop & Mobile Responsive / PWA)

---

## 1. Bản Chất Sản Phẩm (Product Truths)

ZaloCRM là hệ thống quản lý hội thoại bán hàng, chăm sóc khách hàng và đồng bộ phễu kinh doanh đa kênh (Zalo Official Account, Zalo Cá Nhân qua Extension/Worker, Leads Facebook) dành riêng cho ngành Dệt May Vĩnh Phát.

ZaloCRM **không phải** là một ứng dụng chat thông thường, mà là **bàn làm việc tác chiến bán hàng tốc độ cao** (High-Velocity Sales Workspace).

---

## 2. Người Dùng Mục Tiêu (Target Personas)

### A. Nhân viên Kinh doanh & Telesales Dệt May (Mobile & Desktop)
- Thao tác nhanh giữa văn phòng, xưởng dệt và kho vải.
- Cần mở nhanh lịch sử chat với khách, kiểm tra tồn kho hoặc mẫu vải, gửi báo giá ngay trên Zalo.
- Thao tác một tay trên điện thoại màn hình hẹp (360px - 390px iPhone).

### B. Nhân viên Chăm sóc Khách hàng (CSKH) & Điều phối đơn hàng
- Xử lý cùng lúc hàng chục tin nhắn đến từ nhiều nick Zalo khác nhau.
- Cần chuyển tiếp tin nhắn, đính kèm file mẫu vải/chứng từ, gán nhãn trạng thái phễu (Lead → Báo giá → Đặt cọc → Chốt đơn).

### C. Quản lý / Trưởng phòng Kinh doanh
- Theo dõi KPI phản hồi tin nhắn của team theo thời gian thực.
- Kiểm tra báo cáo doanh số, lịch hẹn khảo sát nhà máy, danh sách khách hàng tồn đọng.

---

## 3. Nhiệm Vụ Tối Thượng (High-Stakes Jobs To Be Done)

1. **Tốc độ phản hồi cực nhanh (< 15 giây)**: Giao diện chat và danh sách hội thoại phải tải ngay lập tức, không có độ trễ chuyển tab.
2. **Không bỏ sót khách hàng (Zero Dropped Inquiries)**: Chỉ báo tin nhắn chưa đọc, thông báo đẩy Web Push PWA, cảnh báo mất kết nối socket rõ ràng.
3. **Thao tác một chạm (1-Tap Ergonomics)**:
   - Gọi điện thoại khách hàng trực tiếp từ mobile view.
   - Chuyển trạng thái hẹn/deal stage không quá 2 thao tác chạm.
   - Sao chép thông tin báo giá / tài khoản ngân hàng chỉ với 1 click.
4. **Đồng bộ song phương với VinhPhatERP**:
   - Khi có khách hàng mới hoặc tin nhắn chat, ERP tự động nhận diện và đồng bộ `zalo_contact_id` / `zalo_thread_id`.

---

## 4. Ràng Buộc Kỹ Thuật & Môi Trường Hoạt Động (Operating Constraints)

- **Độ phân giải di động tối thiểu**: 360px (Samsung A series / màn hình phổ thông) đến 390px (iPhone tiêu chuẩn) và 412px (Android cao cấp).
- **Vùng chạm tối thiểu (Touch Targets)**: `44px x 44px` theo tiêu chuẩn WCAG 2.1 AA cho mọi nút bấm, icon thao tác và tab bar.
- **Khả năng chịu đựng mạng yếu/chập chờn**: Banner offline cảnh báo tự động; tin nhắn tạm lưu và gửi lại khi có mạng.
- **Khóa cố định Viewport**: Tôn trọng bàn phím ảo (Soft Keyboard) trên iOS và Android — composer luôn bám đáy, không bị che khuất, không giật layout.
- **Ngôn ngữ giao diện**: 100% Tiếng Việt chuẩn hóa văn phong B2B dệt may chuyên nghiệp, rõ ràng, không dùng tiếng lóng hay emoji trang trí thừa.

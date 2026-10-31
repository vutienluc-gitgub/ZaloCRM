# ZaloCRM — Design System & Visual Governance (Impeccable Standard)

**Owner:** Design Director & Frontend Lead  
**Design Philosophy:** *Utility-First, Zero AI-Slop, High-Density Ergonomics, Strict B2B Craftsmanship.*

---

## 1. Nguyên Tắc Thiết Kế (Core Design Tenets)

1. **Anti AI-Slop (Diệt trừ giao diện máy móc)**:
   - CẤM gradient tím/cyan/hồng tùy tiện.
   - CẤM hội chứng "Cards trong Cards trong Cards" (Nested Box syndrome).
   - CẤM viền kép, viền mờ nhạt không có chức năng phân tách layout.
2. **Distill (Tinh giản tối đa)**:
   - Một màn hình di động chỉ hiển thị những thông tin phục vụ ra quyết định tức thì.
   - Ẩn bớt siêu dữ liệu ít dùng (Deal stage, ID, ngày tạo chi tiết) vào Sheet hoặc Drawer xem thêm.
3. **Harden (Kiên cố hóa trạng thái biên)**:
   - Luôn có Skeleton Layout đồng dạng với nội dung (thay vì spinner xoay ở giữa).
   - Empty State phải có hướng dẫn hành động cụ thể (Call to Action).
   - Text tràn phải có `truncate` an toàn, không được làm vỡ layout ngang ở 360px.
4. **Touch Ergonomics (Công thái học ngón tay)**:
   - Nút bấm chính và tab điều hướng nằm ở nửa dưới màn hình (Thumb Zone).
   - Kích thước vùng bấm tối thiểu: `44px x 44px`.

---

## 2. Bảng Màu & Design Tokens

### Semantic Palette (Vĩnh Phát Identity)
```css
:root {
  /* Brand Tokens */
  --brand-primary: #2151a1;        /* Xanh dương đậm Vĩnh Phát */
  --brand-primary-hover: #1a4284;
  --brand-primary-soft: #e8eef8;   /* Nền highlight, bong bóng tin nhắn nhân viên */
  --brand-primary-ink: #ffffff;

  /* Surfaces & Backgrounds */
  --surface-base: #ffffff;         /* Nền trắng card, sheet */
  --surface-ground: #f8f9fa;       /* Nền ứng dụng ngoài */
  --surface-subtle: #f1f5f9;       /* Bong bóng chat khách hàng, thanh tìm kiếm */
  --surface-active: #e2e8f0;

  /* Typography & Ink */
  --ink-primary: #0f172a;          /* Tiêu đề, chữ chính (Slate 900) */
  --ink-secondary: #475569;        /* Nội dung phụ, timestamp (Slate 600) */
  --ink-muted: #94a3b8;            /* Placeholder, icon vô hiệu (Slate 400) */

  /* Functional Status */
  --status-success: #059669;       /* Đã chốt đơn, Online, Gửi thành công */
  --status-warning: #d97706;       /* Đang thương thảo, Cần phản hồi */
  --status-danger: #dc2626;        /* Mất kết nối, Huỷ lịch, Lỗi tin nhắn */
  --status-info: #0284c7;          /* Lịch hẹn mới, Thông báo hệ thống */

  /* Structural Dividers */
  --line-subtle: #e2e8f0;          /* Đường kẻ ngăn cách danh sách */
  --line-strong: #cbd5e1;
}
```

---

## 3. Hệ Thống Phông Chữ & Nhịp Điệu (Typography Hierarchy)

- **Phông chữ**: Inter, system-ui, -apple-system, Roboto, sans-serif.
- **Quy chuẩn kích thước**:
  - `Display / Header`: `17px`, font-weight `650`, line-height `1.3`, tracking `-0.01em`.
  - `Body Text (Chat bubble)`: `15px`, font-weight `400`, line-height `1.45` (dễ đọc trên màn hình di động, không bị mỏi mắt).
  - `Subtext / Metadata`: `13px`, font-weight `500`, color `--ink-secondary`.
  - `Timestamp / Badge`: `11px` - `12px`, font-weight `550`, tracking `0.02em`.
- **CẤM**: Cỡ chữ nhỏ hơn `11px` (vi phạm khả năng đọc trên thiết bị thực tế).

---

## 4. Quy Chuẩn Thành Phần Di Động (Mobile Component Specs)

### A. Bottom Navigation (`BottomNav.vue`)
- Chiều cao cố định: `52px` (+ `safe-area-inset-bottom`).
- 5 Tabs: Tổng quan, Hội thoại, Khách hàng, Lịch hẹn, Thêm.
- Icon: `22px` - `24px` Lucide/MDI nét mảnh. Chữ nhãn `11px` rõ ràng.
- Active state: Màu `--brand-primary`, thanh chỉ thị (indicator bar) trên đỉnh tab hoặc pill bo tròn nhẹ.

### B. Màn Hình Hội Thoại (`MobileChatView.vue` & `MessageThread.vue`)
- **Header (2 dòng tối đa)**:
  - Dòng 1: Nút Back + Avatar khách + Tên khách (truncate) + Nút gọi điện / kết bạn.
  - Dòng 2: Nick đang chat + Trạng thái online/offline (chấm tròn xanh/xám).
  - CẤM: Tràn sang dòng 3 ở kích thước 360px.
- **Message Bubbles (Bong bóng tin nhắn)**:
  - Tin nhắn khách hàng: Bo góc `16px 16px 16px 4px`, nền `--surface-subtle`, chữ `--ink-primary`.
  - Tin nhắn của tôi: Bo góc `16px 16px 4px 16px`, nền `--brand-primary`, chữ `--brand-primary-ink`.
  - Gom cụm (Grouping): Các tin nhắn liên tiếp cùng người gửi cách nhau chỉ `3px`, ẩn avatar, chỉ hiển thị giờ ở tin cuối cụm.
- **Message Composer (Thanh soạn thảo)**:
  - Bám chặt đáy màn hình (Bottom Pinning), thích ứng chiều cao bàn phím ảo (`calc(env(safe-area-inset-bottom, 0px))`).
  - Thanh công cụ đính kèm (Media, Ghi âm, Mẫu tin nhắn): 1 hàng cuộn ngang mượt mà, không xuống dòng.

### C. Danh Sách Khách Hàng (`MobileContactView.vue`)
- Hàng danh bạ: Chiều cao tối thiểu `64px`, hỗ trợ cử chỉ vuốt (Swipe Actions: Gọi, Chat, Gán nhãn).
- Ô tìm kiếm: Font-size tối thiểu `16px` để ngăn chặn trình duyệt Safari iOS tự động zoom màn hình.
- Bottom Sheet chi tiết: Mở sát mép đáy màn hình (Flush Bottom Sheet), có nút gọi điện to nổi bật.

---

## 5. Danh Sách Anti-Patterns Bị Cấm (Strictly Forbidden)

1. ❌ **Không dùng mã màu Hex trực tiếp** trong CSS/Vue component (`#ffffff`, `rgba(0,0,0,0.1)`). Bắt buộc dùng `var(--token)`.
2. ❌ **Không dùng Emoji** làm icon điều hướng hệ thống (chỉ dùng icon SVG/MDI chuẩn hóa).
3. ❌ **Không để layout tràn ngang** ở bất kỳ breakpoint nào từ `360px` đến `1440px` (`overflow-x: hidden` có kiểm soát).
4. ❌ **Không sử dụng spinner đơn điệu** cho các khối màn hình chính — bắt buộc dùng Skeleton UI.
5. ❌ **Không bóp nghẹt ô nhập liệu** — input text luôn có padding tối thiểu `10px 14px` và font-size `16px` trên mobile.

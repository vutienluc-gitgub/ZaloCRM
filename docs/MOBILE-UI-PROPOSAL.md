# Đề xuất giao diện Mobile — Vĩnh Phát CRM

> Trạng thái: **PROPOSAL** · Phạm vi: `frontend/` (Vue 3 + Vuetify 3 + PWA)
> Mục tiêu: sale dùng điện thoại ngoài hiện trường (tư vấn, chốt đơn, chăm sóc KH) — không phải bản thu nhỏ của desktop.

---

## 0. TL;DR — 8 quyết định chính

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Bottom nav **5 tab**: Tổng quan · Hội thoại · Khách hàng · Lịch hẹn · Thêm | Hiện chỉ có 4 tab, Reports/Settings **không truy cập được** trên mobile |
| 2 | **Chat-first**: mở app vào `/chat` nếu có tin chưa đọc, ngược lại `/` | 80% thời gian sale là trả lời tin |
| 3 | Bỏ nút dark mode ở mobile, ép `hsLight` như desktop | Desktop đã bỏ dark; mobile đang cho bật `dark` → màu lệch brand |
| 4 | Thay `calc(100vh - 120px)` bằng **`100dvh` + flex + `visualViewport`** | Hiện chat bị cắt khi bàn phím mở, và sai trên iOS Safari |
| 5 | **Bottom sheet** thay cho dialog trên mobile | `ContactDetailDialog` đang là dialog desktop, khó chạm |
| 6 | **Swipe action** trên list (nhắn / gọi / đổi trạng thái) | Giảm 2–3 tap cho thao tác lặp |
| 7 | **PWA thật**: service worker + app-shell cache + `shortcuts` | Có manifest nhưng **không có SW** → không cài được, không offline |
| 8 | Bảng dữ liệu → **card list + filter sheet** ở mobile | `ReportsView`/`Settings` hiện render bảng desktop, tràn ngang |

---

## 1. Nguyên tắc thiết kế

**Mobile ERP ≠ desktop thu nhỏ.** Bốn ràng buộc chi phối mọi quyết định:

1. **Một tay, ngón cái.** Mọi hành động chính nằm trong **thumb zone** (dưới 65% chiều cao màn hình). Nút huỷ/nguy hiểm đặt xa ngón cái.
2. **3 tap tới việc.** Mở app → thấy việc cần làm → làm được. Không menu lồng menu.
3. **Dữ liệu dày nhưng chạm thoáng.** Mật độ cao hơn app tiêu dùng, nhưng **touch target tối thiểu 44×44px**, row list ≥ 64px.
4. **Mạng yếu là mặc định.** Mọi thao tác ghi phải có trạng thái `pending → sent → failed`, queue offline, retry 1 tap.

**Con xoay thiết kế** (theo chuẩn ERP của Vĩnh Phát):

| Dial | Mobile | Ghi chú |
|---|---|---|
| Density | **7/10** | Thấp hơn desktop (8–9) vì ngón tay to hơn con trỏ |
| Variance | **2/10** | Bố cục dự đoán được, không phá cách |
| Motion | **2/10** | 120–180ms, chỉ dùng cho sheet/slide, không animation trang trí |

---

## 2. Audit hiện trạng

| Vấn đề | File | Mức độ |
|---|---|---|
| Chat cao `calc(100vh - 120px)` — cắt nội dung khi bàn phím mở, sai trên iOS | `views/MobileChatView.vue:4` | 🔴 Cao |
| Bottom nav chỉ 4 tab, Reports/Cài đặt/Media **không vào được** | `components/BottomNav.vue:19-24` | 🔴 Cao |
| Dark mode mobile bật được nhưng desktop đã bỏ → theme `dark` lệch brand | `layouts/MobileLayout.vue:47-60` | 🟠 TB |
| App bar hardcode `#00F2FF → #0077B6` + icon robot, lệch teal-navy của desktop | `layouts/MobileLayout.vue:10-13` | 🟠 TB |
| Chi tiết KH dùng dialog desktop trên mobile | `views/MobileContactView.vue:80-85` | 🟠 TB |
| Không có safe-area top (chỉ bottom), không xử lý `orientationchange` | `layouts/MobileLayout.vue`, `use-mobile.ts` | 🟠 TB |
| `use-mobile` chỉ nghe `resize`, không nghe `visualViewport` | `composables/use-mobile.ts:26` | 🟡 Thấp |
| Không có service worker → PWA không cài được | `frontend/public/` | 🟠 TB |
| `public/` còn file rác: `.xlsx`, `zalo_verifier*.html` | `frontend/public/` | 🟡 Thấp |
| `MessageThread` (desktop) render toàn bộ trong list mobile, không virtualize | `views/MobileChatView.vue:29-41` | 🟠 TB |
| Chỉ Chat + Contacts có bản mobile; Dashboard/Appointments là view desktop co giãn | `App.vue:27-31` | 🔴 Cao |

---

## 3. Kiến trúc thông tin

### 3.1 Bottom navigation (5 tab)

```
┌─────────────────────────────────────────────┐
│  Tổng quan   Hội thoại  Khách hàng  Lịch hẹn  Thêm │
│   ▣ 3         ● 12          ◍            ◷        ⋯  │
└─────────────────────────────────────────────┘
```

| Tab | Route | Badge | Ghi chú |
|---|---|---|---|
| Tổng quan | `/` | — | Việc hôm nay + KPI cá nhân |
| Hội thoại | `/chat` | Số tin **chưa đọc** | Tab mặc định nếu có unread |
| Khách hàng | `/contacts` | — | |
| Lịch hẹn | `/appointments` | Số hẹn **hôm nay** | |
| Thêm | `/more` | — | Báo cáo, Kho media, Cài đặt, Hồ sơ, Đăng xuất |

**Quy ước:** tab active dùng `--brand` + label đậm; tab inactive `--muted` 60%. Badge dạng chấm số, tối đa `99+`.

### 3.2 Luồng chính (3 tap)

```
Mở app → Tổng quan
   ├── [Việc hôm nay] "3 KH chưa trả lời"  → Chat (đã lọc)
   ├── [Lịch hẹn] "2 hẹn hôm nay"          → Lịch hẹn
   └── [Khách mới] "5 khách"               → Khách hàng (lọc new)

Hội thoại → chạm KH → Thread → gửi tin / gọi / ghi chú
Khách hàng → chạm KH → Sheet chi tiết → Gọi / Nhắn / Đổi trạng thái
```

---

## 4. Design tokens cho mobile

Kế thừa token desktop, **không tạo bảng màu mới**.

```css
:root {
  /* Brand (đã có) */
  --brand:        #1786be;   /* --smax-primary */
  --brand-700:    #0b5880;
  --brand-soft:   #e4f1f8;

  /* Surfaces */
  --surface:      #ffffff;
  --surface-2:    #f7f9fc;
  --border:       #e7eaf0;

  /* Text */
  --ink:          #141a24;
  --muted:        #64748b;

  /* Semantic */
  --success: #12b76a;  --danger: #f04438;
  --warning: #f5a524;  --info:   #1786be;

  /* Mobile scale */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-8: 32px;

  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-sheet: 20px;

  --tap: 44px;            /* touch target tối thiểu */
  --row: 64px;            /* list row tối thiểu */
  --appbar: 56px;
  --bottomnav: 56px;

  --safe-t: env(safe-area-inset-top, 0px);
  --safe-b: env(safe-area-inset-bottom, 0px);
  --kb: 0px;              /* set bằng visualViewport khi bàn phím mở */
}
```

**Type scale mobile**

| Vai trò | Size / line-height | Weight |
|---|---|---|
| Screen title | 20 / 26 | 600 |
| Section header | 13 / 18, letter-spacing .04em | 600, uppercase, `--muted` |
| Body | 15 / 22 | 400 |
| List primary | 15 / 20 | 500 |
| List secondary | 13 / 18 | 400, `--muted` |
| Caption / timestamp | 12 / 16 | 400, `--muted` |
| Số liệu KPI | 24 / 28, `tabular-nums` | 600 |

> Quy tắc ERP: mọi con số (tiền, số lượng, mét vải) dùng `font-variant-numeric: tabular-nums` và **căn phải**.

---

## 5. Đặc tả màn hình

### 5.1 Khung chung (MobileLayout mới)

```
┌───────────────────────────────┐ ← --safe-t
│ ☰/←   Tiêu đề         🔔  ⋯  │ 56px, surface, border-bottom
├───────────────────────────────┤
│                               │
│         NỘI DUNG              │ flex:1, overflow-y:auto
│      (padding 16px)           │ overscroll-behavior: contain
│                               │
├───────────────────────────────┤
│  ▣      ●       ◍      ◷    ⋯ │ 56px + --safe-b
└───────────────────────────────┘
```

- App bar: **không** dùng gradient neon. Nền `--surface`, chữ `--ink`, icon 24px, chỉ 2 action (chuông + overflow).
- Bỏ nút theme + logout khỏi app bar (chuyển vào tab **Thêm**).
- `OfflineIndicator` thành **thanh mảnh 28px** ngay dưới app bar, màu `--warning` khi offline.

### 5.2 Tab Tổng quan

```
┌───────────────────────────────┐
│ Chào buổi sáng, Chị Lan       │
│ Thứ Năm, 29/10                │
├───────────────────────────────┤
│ VIỆC HÔM NAY                  │
│ ┌───────────────────────────┐ │
│ │ ● 3 khách chưa trả lời  › │ │  → /chat?filter=unanswered
│ ├───────────────────────────┤ │
│ │ ◷ 2 lịch hẹn hôm nay    › │ │  → /appointments?date=today
│ ├───────────────────────────┤ │
│ │ + 5 khách mới           › │ │  → /contacts?status=new
│ └───────────────────────────┘ │
│                               │
│ HIỆU SUẤT CỦA TÔI (tuần)      │
│ ┌──────────┐ ┌──────────┐     │
│ │   128    │ │   92%    │     │
│ │ Tin gửi  │ │ Tỉ lệ PH │     │
│ └──────────┘ └──────────┘     │
│ ┌──────────┐ ┌──────────┐     │
│ │    7     │ │   4.8    │     │
│ │ Chốt đơn │ │ Điểm KH  │     │
│ └──────────┘ └──────────┘     │
├───────────────────────────────┤
│ [Xem báo cáo đầy đủ]          │
└───────────────────────────────┘
```

- KPI card 2 cột, không phải chart. Chart chỉ ở màn Báo cáo.
- Skeleton: 3 hàng việc + 4 ô KPI (không spinner giữa màn hình).
- Empty state: "Hôm nay bạn đã xử lý hết việc 🎉" → dùng icon Lucide, **không emoji** (theo guard).

### 5.3 Tab Hội thoại — danh sách

```
┌───────────────────────────────┐
│ Hội thoại            [🔍] [⚙] │
│ ┌───────────────────────────┐ │
│ │ Tìm tên / SĐT / nội dung  │ │
│ └───────────────────────────┘ │
│ (Tất cả) (Chưa đọc) (Của tôi) │ ← chip cuộn ngang
├───────────────────────────────┤
│ ◉  Nguyễn Thị Hoa     14:32  │
│    Dạ em gửi báo giá...   ②  │
│    ● Nick: VP-Sale-01        │
├───────────────────────────────┤
│ ◉  Trần Văn Bình     12:05   │
│    [Hình ảnh]                │
│    ● Nick: VP-Sale-02  ✓✓    │
└───────────────────────────────┘
```

- Row 72px: avatar 40px + badge nick + 2 dòng text + timestamp + unread pill.
- **Swipe trái** → "Đánh dấu đã đọc"; **swipe phải** → "Ghim".
- Pull-to-refresh → `fetchConversations()`.
- Long-press → action sheet (Ghim, Tắt thông báo, Chuyển cho đồng nghiệp).

### 5.4 Tab Hội thoại — thread

```
┌───────────────────────────────┐
│ ←  Hoa  ●Đang hoạt động   ⋯  │  app bar 56px
├───────────────────────────────┤
│  Hôm nay                      │
│        ┌──────────────┐       │
│        │ Dạ em chào chị│       │  ← self: --brand-soft, phải
│        │ 14:30      ✓✓ │       │
│        └──────────────┘       │
│ ┌──────────────┐              │
│ │ Chị cần báo  │              │  ← other: --surface, trái
│ │ giá lô vải   │              │
│ └──────────────┘ 14:31        │
├───────────────────────────────┤
│ [📎] [Nhập tin nhắn...]  [🎤] │  composer, sticky bottom
└───────────────────────────────┘
```

**Composer (điểm quan trọng nhất):**

| Hành vi | Kết quả |
|---|---|
| Chạm ô nhập | Bàn phím mở, thread `scrollToBottom`, composer nhảy theo `visualViewport` |
| Giữ `🎤` | Ghi âm (giữ để ghi, thả để gửi, vuốt lên để huỷ) |
| `📎` | Bottom sheet: Ảnh · Camera · Tệp · Vị trí |
| Gõ `/` | Quick reply template (8 biến cá nhân hóa có sẵn) |
| Gửi khi offline | Bubble mờ + icon đồng hồ; tự flush khi có mạng |

- `show-contact-panel=false` hiện tại → thay bằng **chạm avatar/tên** mở sheet hồ sơ KH (đọc-only + nút "Mở hồ sơ đầy đủ").
- Virtualize: chỉ render ~30 bubble quanh viewport (dùng `IntersectionObserver` hoặc `vue-virtual-scroller`).
- Ảnh: `loading="lazy"`, `decoding="async"`, thumbnail 240px, tap → viewer full-screen có pinch-zoom.

### 5.5 Tab Khách hàng

```
┌───────────────────────────────┐
│ Khách hàng            [🔍] [+]│
│ ┌───────────────────────────┐ │
│ │ Tìm tên / SĐT             │ │
│ └───────────────────────────┘ │
│ (Tất cả)(Mới)(Đã LH)(Quan tâm)│
├───────────────────────────────┤
│ ◉  Nguyễn Thị Hoa       [Mới]│
│    0901 234 567 · VP-Sale-01 │
│ ─────────────────────────────│
│ ◉  Trần Văn Bình    [Quan tâm]│
│    0912 345 678 · VP-Sale-02 │
└───────────────────────────────┘
```

- Bỏ FAB `+` nổi (đè list) → đưa `+` lên app bar.
- Card → **list row** (dày hơn, ít bo tròn hơn) để quét nhanh 20–30 KH/màn.
- Chạm row → **bottom sheet hồ sơ** (90% chiều cao, kéo xuống để đóng):

```
┌───────────────────────────────┐
│              ▔▔▔              │  drag handle
│  ◉  Nguyễn Thị Hoa    [Mới]  │
│     0901 234 567              │
│  ┌─────────┬─────────┬──────┐ │
│  │  Gọi    │  Nhắn   │ Zalo │ │  3 nút 48px
│  └─────────┴─────────┴──────┘ │
│  Thông tin                    │
│  Nguồn        Facebook        │
│  Phụ trách    VP-Sale-01      │
│  Tạo lúc      12/10/2026      │
│  Ghi chú      ...             │
│  [Sửa hồ sơ]  [Đổi trạng thái]│
└───────────────────────────────┘
```

### 5.6 Tab Lịch hẹn

```
┌───────────────────────────────┐
│ Lịch hẹn            [Hôm nay▾]│
│ ◀  T2  T3  T4  T5  T6  T7  CN ▶│  date strip
├───────────────────────────────┤
│ 09:00  ● Nguyễn Thị Hoa       │
│        Tư vấn lô vải K65      │
│        [Hoàn thành] [Huỷ]     │
│ ─────────────────────────────│
│ 14:30  ● Trần Văn Bình        │
│        Giao mẫu               │
└───────────────────────────────┘
```

- Date strip cuộn ngang, chọn ngày → load.
- Swipe row: trái = Hoàn thành, phải = Huỷ (có confirm sheet).
- FAB `+` tạo hẹn → form full-screen (không dialog).

### 5.7 Tab Thêm

```
┌───────────────────────────────┐
│ Thêm                          │
│ ┌───────────────────────────┐ │
│ │ ▤  Báo cáo              › │ │
│ │ ▦  Kho media            › │ │
│ │ ⚙  Cài đặt              › │ │
│ └───────────────────────────┘ │
│ ┌───────────────────────────┐ │
│ │ ◉  Hồ sơ của tôi        › │ │
│ │ ⏻  Đăng xuất               │ │
│ └───────────────────────────┘ │
│ Phiên bản 3.4.0 · Vĩnh Phát   │
└───────────────────────────────┘
```

### 5.8 Báo cáo trên mobile

Không render bảng. Chuyển thành **card theo chỉ số**:

```
┌───────────────────────────────┐
│ Tổng quan điều hành  [Kỳ ▾]   │
│ ┌───────────┐ ┌───────────┐   │
│ │ 1.284     │ │ 92%       │   │
│ │ Tin gửi   │ │ Tỉ lệ PH  │   │
│ └───────────┘ └───────────┘   │
│ Doanh số theo ngày            │
│ ▁▂▃▅▆▇█▆▅  (sparkline 80px)  │
│ Top 5 sale                    │
│ 1. Lan       128  ████████    │
│ 2. Hùng       96  ██████      │
└───────────────────────────────┘
```

> Nếu cần bảng chi tiết: **card + expand** hoặc chuyển ngang có cột đầu sticky. Không bao giờ để bảng 12 cột tràn màn 375px.

---

## 6. Pattern tương tác

| Pattern | Quy chuẩn |
|---|---|
| **Bottom sheet** | 3 snap: 50% / 90% / full. Drag handle 32×4px. Backdrop `rgba(20,26,36,.42)`. Đóng bằng kéo xuống, chạm backdrop, hoặc `Esc`. |
| **Swipe** | Ngưỡng 72px, màu nền theo ngữ nghĩa (`--success` / `--danger`), icon + label, có haptic nhẹ. Không cho swipe xoá dữ liệu — chỉ đổi trạng thái/ghim. |
| **Pull-to-refresh** | Chỉ ở list (Chat, KH, Lịch hẹn). Không áp dụng trong thread. |
| **Long-press** | 400ms → action sheet. Không dùng long-press cho hành động phá huỷ. |
| **Keyboard** | `100dvh`; composer `position: sticky` + `translateY(-var(--kb))`; `scrollIntoView({block:'end'})` sau khi gửi. |
| **Toast** | Trên composer, không đè bottom nav. Auto-dismiss 3s, có action "Hoàn tác" khi xoá mềm. |
| **Haptic** | `navigator.vibrate(8)` khi gửi thành công / swipe đạt ngưỡng (Android). CSS `:active { scale .98 }` cho iOS. |
| **Transition** | Push/pop 180ms `cubic-bezier(.2,.8,.2,1)`; sheet 220ms. Tôn trọng `prefers-reduced-motion`. |

---

## 7. PWA & hiệu năng

### 7.1 Service worker (đang thiếu)

```ts
// vite.config.ts — dùng vite-plugin-pwa
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    navigateFallback: '/index.html',
    runtimeCaching: [
      { urlPattern: /\/api\/v1\/conversations/, handler: 'NetworkFirst', options: { networkTimeoutSeconds: 3 } },
      { urlPattern: /\.(png|jpg|webp|svg|woff2)$/, handler: 'CacheFirst', options: { expiration: { maxEntries: 300 } } },
    ],
  },
  manifest: { /* đã có, bổ sung screenshots + shortcuts */ },
});
```

Bổ sung `manifest.json`:

```json
"shortcuts": [
  { "name": "Hội thoại", "url": "/chat", "icons": [{ "src": "/brand/vp-logo.png", "sizes": "192x192" }] },
  { "name": "Khách hàng", "url": "/contacts" }
],
"display_override": ["standalone", "minimal-ui"],
"lang": "vi"
```

### 7.2 Ngân sách hiệu năng

| Chỉ số | Mục tiêu |
|---|---|
| First load JS (route Chat) | ≤ 220KB gzip |
| TTI trên 4G trung bình | ≤ 2.5s |
| Danh sách 500 hội thoại | scroll 60fps (virtualize) |
| Ảnh trong thread | thumbnail ≤ 40KB, lazy |
| Gửi tin offline | phản hồi UI < 50ms (optimistic) |

### 7.3 Cắt component desktop khỏi mobile

Hiện `MobileChatView` import nguyên `ConversationList.vue` (1.000+ dòng) và `MessageThread.vue` (1.800+ dòng). Đề xuất tách:

```
components/mobile/
  MobileConversationRow.vue
  MobileThread.vue
  MobileComposer.vue
  MobileSheet.vue
  MobileKpiCard.vue
  MobileListRow.vue
  MobileDateStrip.vue
```

Lợi ích: bundle mobile nhỏ hơn, không kéo CSS desktop, dễ test riêng.

---

## 8. Accessibility & an toàn

- [ ] Touch target ≥ 44×44px (kể cả icon-only trên app bar).
- [ ] Icon-only button có `aria-label` tiếng Việt ("Quay lại", "Tìm kiếm", "Gửi tin").
- [ ] Tương phản ≥ 4.5:1. `--brand #1786be` trên trắng = 4.0:1 → **không dùng làm chữ nhỏ**, chỉ dùng cho nền/viền; chữ link dùng `--brand-700 #0b5880` (6.4:1).
- [ ] Không emoji trong UI, chỉ SVG (Lucide) — theo Architecture Guard.
- [ ] `prefers-reduced-motion` tắt slide.
- [ ] Privacy PIN: giữ blur `▒` như desktop, áp dụng cho list + thread.
- [ ] Không auto-play media; không auto-download ảnh khi 4G (setting "Chỉ tải ảnh trên Wi-Fi").
- [ ] Xoá dữ liệu luôn có confirm sheet 2 bước.

---

## 9. Lộ trình triển khai

> **Trạng thái 2026-10-29 — P0 đã code xong (frontend build + vue-tsc pass):**
> shell mobile, bottom nav 5 tab + badge, `/more`, chat full-height với
> `100dvh`/`--kb`/`visualViewport`, contact list row + bottom sheet, dashboard
> mobile, deep-link `?filter=unanswered`. Composer mobile **chưa tách file riêng** —
> P0 dùng lại composer của `MessageThread` (đã có offline queue). PWA/service worker,
> swipe actions, virtualization, lịch hẹn & báo cáo mobile → P1.

### P0 — Sửa lỗi chặn dùng (≈ 5–6 ngày)

| Việc | File |
|---|---|
| Shell mới: app bar 56px, safe-area, bỏ dark toggle, offline bar | `layouts/MobileLayout.vue` |
| Bottom nav 5 tab + badge + route `/more` | `components/BottomNav.vue`, `router/index.ts`, `views/MoreView.vue` |
| Fix `100dvh` + `visualViewport` cho chat | `views/MobileChatView.vue`, `composables/use-mobile.ts` |
| Composer mobile (gửi text + ảnh + offline queue) | Dùng lại composer `components/chat/MessageThread.vue` (P0) |
| Contact list row + bottom sheet chi tiết | `views/MobileContactView.vue`, `components/mobile/MobileSheet.vue` |
| Dashboard mobile (việc hôm nay + 4 KPI) | `views/DashboardView.vue` hoặc `views/mobile/MobileDashboard.vue` |

### P1 — Hoàn thiện trải nghiệm (≈ 8–10 ngày)

| Việc | Ghi chú |
|---|---|
| Swipe actions (chat/contact/appointment) | Dùng `v-touch` hoặc composable `useSwipe` |
| Lịch hẹn mobile: date strip + card + tạo hẹn full-screen | |
| Báo cáo mobile: KPI card + sparkline | Chart.js đã có |
| Virtualize conversation + message list | `vue-virtual-scroller` hoặc custom |
| PWA: service worker + shortcuts + install prompt | `vite-plugin-pwa` |
| Quick reply templates trong composer | Tận dụng 8 biến có sẵn |

### P2 — Nâng cao (≈ 6–8 ngày)

| Việc | Ghi chú |
|---|---|
| Voice message (ghi âm, waveform, gửi) | MediaRecorder API |
| Camera capture + nén ảnh client-side | `canvas`/`createImageBitmap`, target ≤ 300KB |
| Push notification (Web Push) | Cần VAPID key + backend endpoint |
| Offline đọc dữ liệu (cache conversations 7 ngày) | IndexedDB |
| Chế độ "một tay" (kéo toàn bộ action xuống nửa dưới) | Tuỳ chọn |
| Tablet 768–1024: 2 cột (list + thread) | Breakpoint riêng |

---

## 10. Việc cần chốt trước khi code

1. **Tab mặc định**: `/chat` (chat-first) hay `/` (dashboard-first)?
2. **5 tab hay 4 tab + FAB giữa?** (FAB giữa phù hợp tạo nhanh, nhưng che nội dung)
3. **Có giữ dark mode mobile không?** Nếu có phải làm theme `hsDark` đúng brand, không dùng theme `dark` mặc định Vuetify.
4. **Ngưỡng breakpoint**: giữ 768px hay nâng lên 900px (điện thoại gập / tablet nhỏ)?
5. **Push notification**: có cần trong giai đoạn này không (cần backend + VAPID)?

---

## Phụ lục — Wireframe tổng hợp

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ TỔNG QUAN│ │ HỘI THOẠI│ │   CHAT   │ │    KH    │
├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤
│ Chào Lan │ │ 🔍       │ │ ← Hoa  ⋯ │ │ 🔍   +   │
│          │ │ (chip)   │ │          │ │ (chip)   │
│ VIỆC     │ │ ──────── │ │  bubble  │ │ ──────── │
│ ▸ 3 chưa │ │ ◉ Hoa  ② │ │  bubble  │ │ ◉ Hoa    │
│ ▸ 2 hẹn  │ │ ◉ Bình   │ │          │ │ ◉ Bình   │
│ ▸ 5 mới  │ │ ◉ Lan    │ │          │ │ ◉ Lan    │
│          │ │          │ │          │ │          │
│ KPI 2×2  │ │          │ │ [📎][___]│ │          │
├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤
│▣ ● ◍ ◷ ⋯│ │▣ ● ◍ ◷ ⋯│ │▣ ● ◍ ◷ ⋯│ │▣ ● ◍ ◷ ⋯│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

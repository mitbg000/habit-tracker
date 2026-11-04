# Nhịp — Habit Tracker (ghi chú bàn giao cho Claude Code)

Người dùng viết tiếng Việt → luôn trả lời bằng tiếng Việt.

## Dự án
Web theo dõi thói quen: Vue 3 + Express 5 + Knex (SQLite hoặc MySQL/aaPanel).
- Server: `server/` (db.js, security.js, i18n.js, routes/auth|data|notes.js)
- Client: `client/` (Vue 3 `<script setup>`, vue-router, Tailwind v4, lucide-vue-next). Build ra `public/`.
- Chạy: `npm install && npm run build && npm start` (cổng 3000). Dev client: `cd client && npm run dev`.
- Cấu hình: `.env` (xem `.env.example`). `DB_CLIENT=sqlite|mysql`.
- UI theo skill evondevKit `ui-ux`: phẳng, 1 màu nhấn `#181818`, card `rounded-2xl border p-5`, input `h-11 md:h-10`, không đổ bóng (trừ overlay), timeline theo `components/timeline.md` (mới nhất trước, đường nối `left-[15px] w-0.5`, vòng tròn `size-8`, nút "tải thêm" kiểu ghost).

## Đã xong
- Đăng nhập / đăng ký / chống spam (honeypot, captcha, rate limit, khóa tài khoản, header `X-Requested-With`).
- Today / Stats / Habits / Settings (chỉ tiếng Việt).
- **Server cho yêu cầu mới (vừa làm xong):**
  - Bảng `notes` (db.js + database/mysql-schema.sql).
  - `server/routes/notes.js`: GET/POST/PATCH/DELETE `/api/notes` (GET phân trang bằng `before`, tìm kiếm `q`).
  - `server/i18n.js`: middleware dịch trường `error` sang tiếng Anh khi request có header `X-Lang: en`.
  - `auth.js`: `/register` nhận `lang` để tạo thói quen mặc định tiếng Anh/Việt.

## Đã xong (đợt 2 — 2026-11-03)
- **EN/VI:** `client/src/i18n.js` (locale reactive, `t(key, params)`, giá trị có thể là hàm cho số nhiều), `components/LangSwitch.vue` (sidebar, thanh trên mobile, trang auth, Cài đặt). Router dùng `meta.title` là key dịch. `api.js` gửi `X-Lang`; Register gửi `lang`.
- Bối cảnh tái phạm lưu key trung tính (`morning`, `bed`, `bored`…); `relapseKey/relapseLabel` trong `lib/stats.js` map ngược nhãn tiếng Việt cũ.
- **Noteline:** `/noteline`, `views/NotelineView.vue`; nav 5 mục.
- Sửa kèm: `api.del` gửi body `{}` (server bắt DELETE phải là JSON, trước đó xoá thói quen bị 415); tìm kiếm notes dùng `ESCAPE '!'` (SQLite không có escape mặc định); export có thêm `notes`.
- Đã test API (phân trang, tìm kiếm, sửa, xoá, lỗi EN/VI, export) trên SQLite và MySQL 5.7; luồng trình duyệt ở 375px và 1440px không cuộn ngang.

## Đã xong (đợt 3)
- Thói quen có `color`, `icon`, `days`, `goal`, `points`; Noteline có `color`. Cột tự thêm khi khởi động (`server/db.js`).
- Điểm ngày: `dayScore`/`habitDueOn` trong `lib/stats.js`. Thống kê: menu khoảng thời gian, thẻ Tổng quan với biểu đồ điểm theo ngày. Chỉ hiện điểm, không dùng phần trăm và heatmap.
- Giới hạn tần suất API dễ chạm khi seed bằng curl: seed thẳng vào DB.

## Đã xong (đợt 4)
- Việc đã làm: bảng `tasks`, API trong `routes/data.js`, `components/DayTasks.vue`. Điểm cộng vào cả điểm đạt và điểm tối đa của ngày (Today, DayStrip, Stats).

## Mẹo
- Không dùng `pkill -f` (tự giết shell); dùng `fuser -k 3000/tcp`.
- Tài khoản demo cần seed lại (`demo / demo12345`) vì thư mục `data/` không đóng gói.

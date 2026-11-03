# Nhịp — theo dõi thói quen cá nhân

Ứng dụng web đơn giản để ghi lại thói quen mỗi ngày (cần làm, cần tránh, đo bằng số), kèm tâm trạng, thống kê để thấy mình thay đổi ra sao, và Noteline để lưu suy nghĩ theo dòng thời gian. Giao diện có hai ngôn ngữ: **Tiếng Việt** và **English**.

- **Giao diện:** Vue 3 + Vue Router + Tailwind CSS v4 (làm theo bộ quy tắc `ui-ux` của evondevKit)
- **Máy chủ:** Node.js + Express 5
- **Database:** SQLite (mặc định) **hoặc** MySQL/MariaDB (database tạo từ aaPanel)
- **Bảo mật / chống spam:** captcha khi đăng ký, ô bẫy bot + kiểm tra thời gian điền form, giới hạn số lần gọi theo IP, khoá tài khoản 15 phút sau 5 lần sai mật khẩu, mật khẩu băm bcrypt, phiên lưu trong cookie `HttpOnly`, chặn gọi chéo trang, header bảo mật (helmet/CSP)

> Thư mục `public/` đã chứa sẵn bản build của giao diện, nên khi deploy **không cần build lại**.

## Chức năng

| Trang | Việc làm được |
| --- | --- |
| Đăng nhập / Đăng ký | Tạo tài khoản bằng tên đăng nhập + mật khẩu (không cần email) |
| Hôm nay | Ghi từng thói quen, chọn tâm trạng 1–5, ghi chú; khi tái phạm có thể ghi nhanh lúc nào / ở đâu / cảm thấy gì. Xem lại và sửa các ngày trước |
| Thống kê | Menu khoảng thời gian (7 ngày đến 1 năm, tất cả, tuỳ chọn). Thẻ Tổng quan: số liệu gọn và biểu đồ điểm từng ngày. Điểm và huy hiệu của từng thói quen, quy luật tái phạm, việc nào giúp tâm trạng tốt hơn |
| Thói quen | Thêm, sửa, sắp xếp, lưu trữ, xoá |
| Noteline | Ghi nhanh suy nghĩ (Ctrl/⌘ + Enter để lưu), xem theo dòng thời gian gom theo ngày (mới nhất trước), tìm kiếm, sửa tại chỗ, xoá, tải thêm 10 mục mỗi lần |
| Cài đặt | Đổi mật khẩu, chọn ngôn ngữ, tải toàn bộ dữ liệu (cả ghi chú) về dạng JSON |

Ba loại thói quen: **Cần làm** (Đã làm / Không), **Cần tránh** (Giữ được / Tái phạm), **Đo bằng số** (ví dụ số phút lướt mạng, có thể đặt mức tối đa).

### Lịch lặp, mục tiêu chuỗi và huy hiệu

- **Điểm:** mỗi thói quen có mức Nhẹ (1), Vừa (2) hoặc Quan trọng (3). Điểm ngày = điểm đạt / tổng điểm các thói quen phải ghi hoặc đã ghi hôm đó. Ngày đã qua không ghi tính 0 điểm; hôm nay chưa ghi thì Thống kê chưa tính. Không tính những ngày trước khi tạo thói quen; thói quen đã lưu trữ chỉ tính ngày có ghi.
- **Lịch lặp:** mỗi thói quen có thể lặp *mỗi ngày* hoặc chỉ vào một số thứ trong tuần (ví dụ T2, T4, T6). Ngày ngoài lịch không hiện ở trang Hôm nay và không làm đứt chuỗi; chuỗi của thói quen có lịch riêng được đếm theo *lần*.
- **Mục tiêu chuỗi:** đặt một mốc cho thói quen (1 tuần, 2 tuần, 1 tháng, 2 tháng, 3 tháng, 6 tháng, 1 năm). Trang Hôm nay hiện tiến độ `Chuỗi 5/30 ngày` và "Đạt mục tiêu" khi xong.
- **Huy hiệu:** trong *Từng thói quen* ở Thống kê, mỗi thói quen hiện huy hiệu cao nhất đã đạt theo chuỗi dài nhất từng có (chưa đạt mốc nào thì không hiện).
- **Màu và biểu tượng:** chọn từ bảng 8 màu dịu và 20 icon, giúp phân biệt thói quen.
- Dữ liệu lưu ở các cột `color`, `icon`, `days` (vd `1,3,5`, null = mỗi ngày), `goal`, `points` của bảng `habits`; database cũ được tự thêm cột khi khởi động.

### Đổi ngôn ngữ

Bấm nút **VI | EN** ở chân thanh bên (máy tính), trên thanh đầu trang (điện thoại), trên trang đăng nhập/đăng ký hoặc trong `Cài đặt`.

- Lần đầu mở, ngôn ngữ chọn theo trình duyệt (tiếng Việt nếu trình duyệt dùng tiếng Việt, còn lại là tiếng Anh). Lựa chọn được nhớ trên từng thiết bị (`localStorage`).
- Thông báo lỗi từ máy chủ cũng được dịch: trình duyệt gửi header `X-Lang: en`, máy chủ dịch trường `error` (`server/i18n.js`).
- Tài khoản mới nhận bộ thói quen mẫu theo ngôn ngữ lúc đăng ký. Tên thói quen do người dùng đặt thì không dịch.
- Bối cảnh tái phạm (lúc nào / ở đâu / cảm thấy gì) lưu bằng key trung tính (`morning`, `bed`, `bored`…) nên hiển thị đúng ở cả hai ngôn ngữ; dữ liệu cũ lưu nhãn tiếng Việt vẫn được đọc đúng.
- Thêm/sửa câu chữ giao diện: `client/src/i18n.js`.

---

## Deploy trên aaPanel (dùng database MySQL tạo từ aaPanel)

### 1. Cài Node.js
`App Store` → cài **Node.js Version Manager** → cài Node **18 trở lên** (khuyên dùng 20 hoặc 22).

### 2. Tạo database
`Databases` → `Add database`:
- Database name: `habit_tracker`
- Username: `habit_tracker`
- Password: bấm tạo mật khẩu ngẫu nhiên và **chép lại**
- Access: `Local server`

Ghi lại ba giá trị này để điền vào `.env`.

> **Nhập database:** có hai cách, chọn một.
> - *Để ứng dụng tự tạo bảng* (đơn giản nhất): không cần làm gì, lần khởi động đầu tiên sẽ tự tạo 5 bảng (`users`, `habits`, `entries`, `days`, `notes`). Bản cũ nâng cấp lên cũng tự thêm bảng `notes`.
> - *Nhập sẵn bằng file:* ở danh sách database bấm `Import` → chọn `database/mysql-schema.sql` trong gói này.
>
> Cả hai cho ra cùng một cấu trúc, chạy lại nhiều lần không sao.

### 3. Đưa mã nguồn lên
1. Vào `Files`, tạo thư mục `/www/wwwroot/habit-tracker`.
2. Tải file zip lên đó rồi giải nén (nên thấy `package.json`, `server/`, `public/` ngay trong thư mục này).

### 4. Cấu hình `.env`
Trong thư mục dự án, sao chép `.env.example` thành `.env` rồi sửa:

```ini
PORT=3000
JWT_SECRET=<chuỗi ngẫu nhiên dài, xem lệnh bên dưới>
COOKIE_SECURE=false          # đổi thành true sau khi bật SSL
ALLOW_REGISTER=true          # đổi thành false sau khi đã tạo xong tài khoản của bạn

DB_CLIENT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=habit_tracker
DB_USER=habit_tracker
DB_PASSWORD=<mật khẩu database ở bước 2>
```

Tạo `JWT_SECRET` ngẫu nhiên (chạy trong Terminal của aaPanel):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Muốn dùng **SQLite** thay MySQL: để `DB_CLIENT=sqlite`, bỏ qua các dòng `DB_*`. File dữ liệu nằm ở `data/habit.sqlite`.

### 5. Cài thư viện
Trong Terminal (hoặc ô `Terminal` của aaPanel), chạy:
```bash
cd /www/wwwroot/habit-tracker
npm install --omit=dev
```

Kiểm tra kết nối database trước khi chạy (tuỳ chọn, nhưng nên làm):
```bash
npm run init-db
# Thấy "Đã kết nối và tạo bảng xong (database: mysql)" là đúng
```

### 6. Tạo Node project
`Website` → `Node project` → `Add Node project`:

| Mục | Giá trị |
| --- | --- |
| Project path | `/www/wwwroot/habit-tracker` |
| Run option | `start` (tương ứng `npm start`) |
| Port | `3000` (trùng `PORT` trong `.env`) |
| Node version | 18 trở lên |
| Run user | `www` |
| Domain | tên miền của bạn |

Bấm `Submit`, rồi bật `Map project to a domain`/reverse proxy theo hướng dẫn của aaPanel (bước này tạo cấu hình Nginx trỏ domain về cổng 3000).

Nếu aaPanel báo `www` không ghi được: cấp quyền cho thư mục `data/` (khi dùng SQLite) bằng
```bash
chown -R www:www /www/wwwroot/habit-tracker
```

### 7. Bật SSL và hoàn tất
1. `Website` → chọn site → `SSL` → xin chứng chỉ **Let's Encrypt** → bật `Force HTTPS`.
2. Sửa `.env`: `COOKIE_SECURE=true`.
3. Mở trang, bấm **Tạo tài khoản** để tạo tài khoản của bạn.
4. Sửa `.env`: `ALLOW_REGISTER=false` rồi **Restart** project, để không ai khác đăng ký được.

---

## Deploy qua git

Repo công khai nên máy chủ clone được qua HTTPS, không cần SSH key.

**Lần đầu**, trong Terminal của aaPanel:
```bash
git clone https://github.com/mitbg000/habit-tracker.git /www/wwwroot/habit-tracker
cd /www/wwwroot/habit-tracker
cp .env.example .env        # rồi sửa theo bước 4 ở trên
npm ci --omit=dev
npm run init-db
```
Tạo Node project và bật SSL như các bước 6, 7 ở trên.

**Cập nhật về sau:** build và push từ máy bạn (`public/` được commit cùng mã nguồn):
```bash
npm run build
git add -A && git commit -m "Mô tả thay đổi" && git push
```
Rồi trên máy chủ chạy `scripts/deploy.sh` và Restart project. `.env` và `data/` không nằm trong git nên không bị ghi đè.

---

## Chạy thử trên máy

```bash
npm install
cp .env.example .env        # rồi sửa JWT_SECRET
npm start                   # http://localhost:3000
```

Phát triển giao diện (có hot reload):
```bash
cd client && npm install
npm run dev                 # http://localhost:5173, tự chuyển /api sang cổng 3000
```
Build lại giao diện sau khi sửa: `npm run build` ở thư mục gốc (kết quả ghi vào `public/`).

## Cấu trúc thư mục

```
server/            máy chủ Express (API, đăng nhập, chống spam, kết nối DB)
  db.js            SQLite hoặc MySQL, tự tạo bảng
  security.js      captcha, giới hạn tần suất, phiên đăng nhập
  i18n.js          dịch thông báo lỗi sang tiếng Anh khi có header X-Lang: en
  routes/          auth.js, data.js, notes.js (API Noteline)
client/            mã nguồn giao diện Vue 3 (src/i18n.js: từ điển vi/en)
public/            bản build giao diện (đã có sẵn)
database/          mysql-schema.sql để nhập tay vào MySQL
scripts/deploy.sh  cập nhật bản trên máy chủ từ GitHub
.env.example       mẫu cấu hình
```

## Bảng `notes` (Noteline)

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | int, tự tăng | dùng làm con trỏ phân trang (`before`) |
| `user_id` | int | khoá ngoại tới `users`, xoá người dùng thì xoá theo |
| `body` | text | tối đa 5000 ký tự, giữ nguyên xuống dòng |
| `created_at` | bigint (ms) | |
| `updated_at` | bigint (ms), có thể null | khác null nghĩa là đã sửa |

API (cần đăng nhập): `GET /api/notes?limit=&before=&q=` (mới nhất trước, `hasMore` cho biết còn nữa), `POST /api/notes`, `PATCH /api/notes/:id`, `DELETE /api/notes/:id`.

## Sao lưu

- **MySQL:** `Databases` → `Backup` của aaPanel, hoặc đặt lịch trong `Cron`.
- **SQLite:** chép file `data/habit.sqlite` (kèm `-wal`, `-shm` nếu có, hoặc dừng project rồi mới chép).
- Mỗi người dùng cũng có thể tải dữ liệu của mình ở `Cài đặt` → `Tải dữ liệu`.

## Gỡ lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| `Không kết nối/khởi tạo được database` | Kiểm tra lại `DB_NAME`, `DB_USER`, `DB_PASSWORD`; chạy `npm run init-db` để xem lỗi chi tiết |
| `Cannot find module 'better-sqlite3'` | Chỉ cần khi `DB_CLIENT=sqlite`. Chạy `npm install` lại; nếu máy chủ thiếu công cụ biên dịch: `apt install -y build-essential python3` (hoặc `yum groupinstall "Development Tools"`) rồi cài lại. Hoặc chuyển sang `DB_CLIENT=mysql` |
| Đăng nhập xong bị văng ra | `COOKIE_SECURE=true` nhưng site đang chạy HTTP. Bật SSL hoặc đặt lại `false` |
| Tất cả người dùng bị báo "thao tác quá nhanh" | Nginx chưa chuyển đúng IP thật. Dùng cấu hình reverse proxy mặc định của aaPanel (có `X-Forwarded-For`) |
| Trang trắng sau khi deploy | Thiếu thư mục `public/` (chạy `npm run build`), hoặc cổng trong Node project khác `PORT` |
| Quên mật khẩu | Chưa có chức năng khôi phục qua email. Đổi trực tiếp: `node -e "require('bcryptjs').hash('MAT_KHAU_MOI',12).then(console.log)"` rồi cập nhật cột `password_hash` của bảng `users` |

## Ghi chú thiết kế

- Chỉ cần tên đăng nhập, không thu email: ít dữ liệu cá nhân hơn, và không có khôi phục mật khẩu tự động.
- Tên thói quen do bạn tự đặt, mặc định là "Mục A / Mục B" cho các mục nhạy cảm để người khác liếc qua không hiểu.
- "Ngày" tính theo múi giờ của trình duyệt đang dùng.
- Ngày chưa ghi không được tính vào chuỗi: ghi đều thì chuỗi mới tăng.

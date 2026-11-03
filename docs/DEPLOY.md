# Deploy Nhịp lên aaPanel qua GitHub

Dùng MySQL trên aaPanel và mã nguồn từ repo công khai `mitbg000/habit-tracker`.
Bản build giao diện (`public/`) có sẵn trong repo nên máy chủ không cần build.

## Bước 1. Cài Node.js

Vào `App Store`, cài **Node.js Version Manager**, rồi cài Node **20 hoặc 22**.

## Bước 2. Tạo database

Vào `Databases` → `Add database`:

| Mục | Giá trị |
| --- | --- |
| Database name | `habit_tracker` |
| Username | `habit_tracker` |
| Password | Bấm tạo ngẫu nhiên và **chép lại** |
| Access | `Local server` |

Không cần nhập file SQL, app tự tạo bảng ở bước 4.

## Bước 3. Lấy mã nguồn

Mở Terminal của aaPanel. Thư mục đích phải chưa tồn tại hoặc đang trống.

```bash
git clone https://github.com/mitbg000/habit-tracker.git /www/wwwroot/habit-tracker
```

```bash
cd /www/wwwroot/habit-tracker && cp .env.example .env
```

## Bước 4. Cấu hình và cài đặt

Tạo chuỗi bí mật rồi chép kết quả lại:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Mở file `.env` (trong `Files` của aaPanel, hoặc bằng `nano .env`) và sửa thành:

```ini
PORT=3000
JWT_SECRET=<chuỗi vừa tạo>
COOKIE_SECURE=false
ALLOW_REGISTER=true

DB_CLIENT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=habit_tracker
DB_USER=habit_tracker
DB_PASSWORD=<mật khẩu ở bước 2>
```

Cài thư viện:

```bash
npm ci --omit=dev
```

Tạo bảng và kiểm tra kết nối. Thấy dòng `Đã kết nối và tạo bảng xong (database: mysql)` là đúng:

```bash
npm run init-db
```

Cấp quyền cho user chạy app:

```bash
chown -R www:www /www/wwwroot/habit-tracker
```

## Bước 5. Tạo Node project

Vào `Website` → `Node project` → `Add Node project`:

| Mục | Giá trị |
| --- | --- |
| Project path | `/www/wwwroot/habit-tracker` |
| Run option | `start` |
| Port | `3000` (trùng `PORT` trong `.env`) |
| Node version | Bản đã cài ở bước 1 |
| Run user | `www` |
| Domain | Tên miền của bạn |

Bấm `Submit`, rồi bật `Map project to a domain` hoặc reverse proxy. Tên miền cần trỏ về IP máy chủ trước đó.

Mở thử `http://tên-miền-của-bạn`, thấy trang đăng nhập là được.

## Bước 6. Bật SSL và khoá đăng ký

Làm đúng thứ tự này:

1. Vào `Website` → chọn site → `SSL`, xin chứng chỉ **Let's Encrypt** và bật `Force HTTPS`.
2. Sửa `.env` thành `COOKIE_SECURE=true`, rồi **Restart** project.
3. Mở `https://tên-miền-của-bạn` và **tạo tài khoản của bạn**.
4. Sửa `.env` thành `ALLOW_REGISTER=false`, rồi **Restart** để không ai khác đăng ký được.

## Bước 7. Thử nhanh

- Ghi vài thói quen, đổi ngôn ngữ VI/EN, thêm một ghi chú Noteline, xem trang Thống kê.
- Tắt rồi mở lại trình duyệt, kiểm tra vẫn còn đăng nhập.

## Cập nhật về sau

Trên máy phát triển, build rồi push:

```bash
npm run build
```

```bash
git add -A && git commit -m "Mô tả thay đổi" && git push
```

Trên máy chủ:

```bash
cd /www/wwwroot/habit-tracker && bash scripts/deploy.sh
```

Sau đó bấm **Restart** project trong aaPanel. Script không ghi đè `.env` và dữ liệu, cột mới trong database tự được thêm.

Nếu git báo `dubious ownership` khi chạy script bằng `root`, chạy lệnh dưới rồi chạy lại script. Sau đó chạy lại lệnh `chown` ở bước 4 để trả quyền cho `www`.

```bash
git config --global --add safe.directory /www/wwwroot/habit-tracker
```

## Sao lưu

Vào `Databases` → `Backup`, hoặc đặt lịch trong `Cron`. Dữ liệu nằm trong MySQL, không nằm trong git.

## Gỡ lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| `npm run init-db` báo lỗi | Kiểm tra `DB_NAME`, `DB_USER`, `DB_PASSWORD` trong `.env` |
| Đăng nhập xong bị văng ra | `COOKIE_SECURE=true` nhưng site đang chạy HTTP. Bật SSL hoặc đặt lại `false` |
| Trang trắng hoặc 502 | Cổng trong Node project khác `PORT`, hoặc project chưa chạy. Xem log của project trong aaPanel |
| Báo "thao tác quá nhanh" với mọi người | Nginx chưa chuyển đúng IP thật. Dùng cấu hình reverse proxy mặc định của aaPanel |
| Cập nhật xong giao diện không đổi | Quên `npm run build` trước khi push, hoặc tab cũ còn mở (tải lại trang) |
| Tạo tài khoản báo đang tắt | `ALLOW_REGISTER=false`. Đổi lại `true`, Restart, tạo xong đổi về `false` |

## Lưu ý

- Chỉ đặt `JWT_SECRET` một lần, đổi chuỗi này sẽ làm mọi người bị đăng xuất.
- Không đưa `.env` lên GitHub vì repo công khai; file này đã nằm trong `.gitignore`.

// Tạo bảng trong database đã cấu hình ở .env rồi thoát.
// Dùng khi muốn kiểm tra kết nối MySQL từ aaPanel trước khi chạy ứng dụng.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { db, migrate, client } = require('./db');

migrate()
  .then(async () => {
    console.log(`Đã kết nối và tạo bảng xong (database: ${client}).`);
    await db.destroy();
  })
  .catch(async (err) => {
    console.error('Lỗi:', err.message);
    await db.destroy();
    process.exit(1);
  });

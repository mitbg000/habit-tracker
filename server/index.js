const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { migrate, client } = require('./db');
const { limiters, requireJsonAndHeader, requireAuth } = require('./security');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const notesRoutes = require('./routes/notes');
const { langMiddleware } = require('./i18n');
const compression = require('compression');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Chạy sau Nginx của aaPanel: lấy đúng IP người dùng cho rate limit
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(compression());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true, db: client }));

// Dữ liệu cá nhân: không cho proxy lưu, trình duyệt phải hỏi lại máy chủ (không đổi thì nhận 304 theo ETag)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'private, no-cache');
  next();
});
app.use('/api', langMiddleware, limiters.api, requireJsonAndHeader);
app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, dataRoutes);
app.use('/api', requireAuth, notesRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Không tìm thấy.' }));

// Giao diện Vue đã build
const publicDir = path.resolve(__dirname, '..', 'public');
if (fs.existsSync(path.join(publicDir, 'index.html'))) {
  app.use(express.static(publicDir, { index: false, maxAge: '7d', setHeaders(res, file) {
    if (file.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    // Tên file trong assets/ có mã băm, đổi nội dung là đổi tên nên giữ được lâu
    else if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } }));
  app.get(/^\/(?!api).*/, (req, res) => {
    // File tĩnh không tồn tại (có đuôi .js, .css, .png...) thì trả 404 thay vì trả trang chủ
    if (path.extname(req.path)) return res.status(404).type('text/plain').send('Not found');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('Chưa có giao diện. Chạy "npm run build" để build thư mục client.'));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu gửi lên không hợp lệ.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu quá lớn.' });
  console.error(err);
  res.status(500).json({ error: 'Có lỗi phía máy chủ, thử lại sau.' });
});

migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`Habit Tracker đang chạy ở cổng ${PORT} (database: ${client})`));
  })
  .catch((err) => {
    console.error('Không kết nối/khởi tạo được database:', err.message);
    process.exit(1);
  });

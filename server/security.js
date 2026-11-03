const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const svgCaptcha = require('svg-captcha');

const JWT_SECRET = process.env.JWT_SECRET || '';
const COOKIE_NAME = 'ht_session';
const SESSION_DAYS = 30;

if (!JWT_SECRET || JWT_SECRET.length < 24 || JWT_SECRET.startsWith('doi-chuoi')) {
  console.warn('[CẢNH BÁO] JWT_SECRET chưa được đặt hoặc quá ngắn. Hãy đặt chuỗi ngẫu nhiên dài trong file .env');
}
const secret = JWT_SECRET || crypto.randomBytes(32).toString('hex');

/* ---------------- Captcha (dùng một lần, hết hạn sau 5 phút) ---------------- */

const captchas = new Map(); // id -> { answer, expires }
const CAPTCHA_TTL = 5 * 60 * 1000;
const CAPTCHA_MAX = 5000;

function createCaptcha() {
  const c = svgCaptcha.create({
    size: 5,
    noise: 2,
    ignoreChars: '0oO1ilI',
    color: true,
    background: '#f4f1ea',
    width: 140,
    height: 46,
  });
  const id = crypto.randomBytes(16).toString('hex');
  if (captchas.size >= CAPTCHA_MAX) {
    // tránh bị lạm dụng làm đầy bộ nhớ
    const firstKey = captchas.keys().next().value;
    captchas.delete(firstKey);
  }
  captchas.set(id, { answer: c.text.toLowerCase(), expires: Date.now() + CAPTCHA_TTL });
  return { id, svg: c.data };
}

function verifyCaptcha(id, answer) {
  if (!id || !answer) return false;
  const item = captchas.get(String(id));
  captchas.delete(String(id)); // dùng một lần dù đúng hay sai
  if (!item || item.expires < Date.now()) return false;
  const a = Buffer.from(String(answer).trim().toLowerCase());
  const b = Buffer.from(item.answer);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of captchas) if (v.expires < now) captchas.delete(k);
}, 60 * 1000).unref();

/* ---------------- Giới hạn tần suất ---------------- */

const message = (msg) => ({ error: msg });

const limiters = {
  // toàn bộ API
  api: rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: message('Bạn thao tác quá nhanh, hãy thử lại sau ít phút.'),
  }),
  // đăng nhập: chống dò mật khẩu theo IP
  login: rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: message('Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.'),
  }),
  // đăng ký: chống tạo tài khoản hàng loạt
  register: rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: message('Quá nhiều lần đăng ký từ địa chỉ này. Vui lòng thử lại sau.'),
  }),
  captcha: rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: message('Tải mã xác nhận quá nhiều lần.'),
  }),
};

/* ---------------- Chống bot đơn giản ---------------- */

// Trường ẩn "website" không được người thật điền; form phải được gửi sau ít nhất 2 giây kể từ khi mở
function botCheck(req) {
  const { website, formStartedAt } = req.body || {};
  if (website) return 'bot';
  const started = Number(formStartedAt);
  if (!started || Date.now() - started < 2000) return 'too_fast';
  return null;
}

// Chỉ nhận JSON từ chính ứng dụng (chặn form submit chéo trang)
function requireJsonAndHeader(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (!req.is('application/json') || req.get('X-Requested-With') !== 'habit-tracker') {
      return res.status(415).json({ error: 'Yêu cầu không hợp lệ.' });
    }
  }
  next();
}

/* ---------------- Phiên đăng nhập ---------------- */

function setSession(res, user) {
  const token = jwt.sign({ uid: user.id, u: user.username }, secret, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: String(process.env.COOKIE_SECURE).toLowerCase() === 'true',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập.' });
  try {
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.uid, username: payload.u };
    next();
  } catch {
    clearSession(res);
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn.' });
  }
}

module.exports = {
  createCaptcha,
  verifyCaptcha,
  limiters,
  botCheck,
  requireJsonAndHeader,
  setSession,
  clearSession,
  requireAuth,
};

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const {
  createCaptcha, verifyCaptcha, limiters, botCheck,
  setSession, clearSession, requireAuth,
} = require('../security');

const router = express.Router();

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
// hash giả để so sánh khi tài khoản không tồn tại (thời gian phản hồi như nhau)
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

const DEFAULT_HABITS_EN = [
  { name: 'Leave the room', type: 'build' },
  { name: 'Exercise', type: 'build' },
  { name: 'Item A', type: 'quit' },
  { name: 'Item B', type: 'quit' },
  { name: 'Social media', type: 'number', unit: 'min', target: 30 },
];

const DEFAULT_HABITS = [
  { name: 'Ra khỏi phòng', type: 'build' },
  { name: 'Vận động', type: 'build' },
  { name: 'Mục A', type: 'quit' },
  { name: 'Mục B', type: 'quit' },
  { name: 'Mạng xã hội', type: 'number', unit: 'phút', target: 30 },
];

const registerEnabled = () => String(process.env.ALLOW_REGISTER ?? 'true').toLowerCase() !== 'false';

router.get('/config', (req, res) => {
  res.json({ allowRegister: registerEnabled() });
});

router.get('/captcha', limiters.captcha, (req, res) => {
  const { id, svg } = createCaptcha();
  res.set('Cache-Control', 'no-store');
  res.json({ id, svg });
});

router.post('/register', limiters.register, async (req, res) => {
  if (!registerEnabled()) return res.status(403).json({ error: 'Đăng ký tài khoản mới đang tắt.' });

  if (botCheck(req)) return res.status(400).json({ error: 'Vui lòng thử lại.' });

  const { username, password, captchaId, captcha } = req.body || {};
  if (!verifyCaptcha(captchaId, captcha)) {
    return res.status(400).json({ error: 'Mã xác nhận không đúng hoặc đã hết hạn.', field: 'captcha' });
  }

  const name = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,32}$/.test(name)) {
    return res.status(400).json({ error: 'Tên đăng nhập 3–32 ký tự, chỉ gồm chữ thường, số, dấu _ và dấu chấm.', field: 'username' });
  }
  const pw = String(password || '');
  if (pw.length < 8 || pw.length > 72) {
    return res.status(400).json({ error: 'Mật khẩu phải từ 8 đến 72 ký tự.', field: 'password' });
  }

  const existing = await db('users').where({ username: name }).first();
  if (existing) return res.status(409).json({ error: 'Tên đăng nhập đã có người dùng.', field: 'username' });

  const hash = await bcrypt.hash(pw, 12);
  const now = Date.now();

  const user = await db.transaction(async (trx) => {
    const [id] = await trx('users').insert({ username: name, password_hash: hash, created_at: now });
    const userId = typeof id === 'object' ? id.id : id;
    const defaults = req.body?.lang === 'en' ? DEFAULT_HABITS_EN : DEFAULT_HABITS;
    await trx('habits').insert(
      defaults.map((h, i) => ({ ...h, user_id: userId, sort: i, created_at: now, archived: false }))
    );
    return { id: userId, username: name };
  });

  setSession(res, user);
  res.status(201).json({ user });
});

router.post('/login', limiters.login, async (req, res) => {
  if (botCheck(req)) return res.status(400).json({ error: 'Vui lòng thử lại.' });

  const name = String(req.body?.username || '').trim().toLowerCase();
  const pw = String(req.body?.password || '');
  const generic = { error: 'Tên đăng nhập hoặc mật khẩu không đúng.' };

  const user = await db('users').where({ username: name }).first();
  if (!user) {
    await bcrypt.compare(pw, DUMMY_HASH);
    return res.status(401).json(generic);
  }

  const now = Date.now();
  if (user.locked_until && Number(user.locked_until) > now) {
    const mins = Math.ceil((Number(user.locked_until) - now) / 60000);
    return res.status(423).json({ error: `Tài khoản tạm khóa do nhập sai nhiều lần. Thử lại sau ${mins} phút.` });
  }

  const ok = await bcrypt.compare(pw, user.password_hash);
  if (!ok) {
    const failed = (user.failed_attempts || 0) + 1;
    const update = { failed_attempts: failed };
    if (failed >= MAX_FAILED) {
      update.failed_attempts = 0;
      update.locked_until = now + LOCK_MINUTES * 60 * 1000;
    }
    await db('users').where({ id: user.id }).update(update);
    return res.status(401).json(generic);
  }

  await db('users').where({ id: user.id }).update({ failed_attempts: 0, locked_until: null });
  setSession(res, user);
  res.json({ user: { id: user.id, username: user.username } });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { current, next } = req.body || {};
  const user = await db('users').where({ id: req.user.id }).first();
  if (!user || !(await bcrypt.compare(String(current || ''), user.password_hash))) {
    return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
  }
  const pw = String(next || '');
  if (pw.length < 8 || pw.length > 72) return res.status(400).json({ error: 'Mật khẩu mới phải từ 8 đến 72 ký tự.' });
  await db('users').where({ id: user.id }).update({ password_hash: await bcrypt.hash(pw, 12) });
  res.json({ ok: true });
});

module.exports = router;

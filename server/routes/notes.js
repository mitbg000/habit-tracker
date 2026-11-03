const express = require('express');
const { db } = require('../db');

const router = express.Router();
const MAX_LEN = 5000;
const PAGE = 20;
const COLORS = ['slate', 'sky', 'teal', 'olive', 'sand', 'clay', 'lavender', 'stone'];

const parse = (n) => ({
  id: n.id,
  body: n.body,
  createdAt: Number(n.created_at),
  updatedAt: n.updated_at == null ? null : Number(n.updated_at),
  color: n.color || null,
});

function cleanBody(raw) {
  const body = String(raw ?? '').replace(/\r\n/g, '\n').trim();
  return body && body.length <= MAX_LEN ? body : null;
}

// Mới nhất trước. Phân trang bằng `before` (id của ghi chú cuối cùng đã nhận).
router.get('/notes', async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || PAGE));
  const before = Number(req.query.before) || null;
  const q = String(req.query.q || '').trim().slice(0, 100);

  const query = db('notes').where({ user_id: req.user.id });
  if (before) query.andWhere('id', '<', before);
  // SQLite không có ký tự escape mặc định cho LIKE; dùng '!' để cả SQLite và MySQL hiểu như nhau
  if (q) query.andWhereRaw("body like ? escape '!'", [`%${q.replace(/[!%_]/g, (c) => `!${c}`)}%`]);

  const rows = await query.orderBy('id', 'desc').limit(limit + 1);
  const hasMore = rows.length > limit;
  res.json({ notes: rows.slice(0, limit).map(parse), hasMore });
});

const validColor = (c) => c === undefined || c === null || COLORS.includes(c);
const COLOR_ERROR = 'Màu không hợp lệ.';

router.post('/notes', async (req, res) => {
  const body = cleanBody(req.body?.body);
  if (!body) return res.status(400).json({ error: 'Ghi chú không được để trống (tối đa 5000 ký tự).' });
  if (!validColor(req.body?.color)) return res.status(400).json({ error: COLOR_ERROR });
  const [id] = await db('notes').insert({ user_id: req.user.id, body, color: req.body?.color ?? null, created_at: Date.now(), updated_at: null });
  const row = await db('notes').where({ id: typeof id === 'object' ? id.id : id }).first();
  res.status(201).json({ note: parse(row) });
});

router.patch('/notes/:id', async (req, res) => {
  const note = await db('notes').where({ id: Number(req.params.id), user_id: req.user.id }).first();
  if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú.' });
  const body = cleanBody(req.body?.body);
  if (!body) return res.status(400).json({ error: 'Ghi chú không được để trống (tối đa 5000 ký tự).' });
  if (!validColor(req.body?.color)) return res.status(400).json({ error: COLOR_ERROR });
  const update = { body, updated_at: Date.now() };
  if (req.body?.color !== undefined) update.color = req.body.color; // null = bỏ màu
  await db('notes').where({ id: note.id }).update(update);
  res.json({ note: parse(await db('notes').where({ id: note.id }).first()) });
});

router.delete('/notes/:id', async (req, res) => {
  const n = await db('notes').where({ id: Number(req.params.id), user_id: req.user.id }).del();
  if (!n) return res.status(404).json({ error: 'Không tìm thấy ghi chú.' });
  res.json({ ok: true });
});

module.exports = router;

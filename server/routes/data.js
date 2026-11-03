const express = require('express');
const { db } = require('../db');

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = ['build', 'quit', 'number'];
const COLORS = ['slate', 'sky', 'teal', 'olive', 'sand', 'clay', 'lavender', 'stone'];
const ICONS = [
  'check', 'ban', 'hash', 'dumbbell', 'bike', 'footprints', 'book', 'brain', 'droplets', 'moon',
  'sun', 'coffee', 'heart', 'phone', 'apple', 'door', 'pill', 'leaf', 'timer', 'music',
];
const GOALS = [7, 14, 30, 60, 90, 180, 365];
const META_KEYS = ['time', 'place', 'feeling', 'note'];

const bad = (res, msg) => res.status(400).json({ error: msg });

function cleanMeta(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const out = {};
  for (const k of META_KEYS) {
    if (meta[k] != null && String(meta[k]).trim() !== '') out[k] = String(meta[k]).trim().slice(0, k === 'note' ? 500 : 40);
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

function parseEntry(e) {
  let meta = null;
  if (e.meta) {
    try { meta = JSON.parse(e.meta); } catch { meta = null; }
  }
  return { habitId: e.habit_id, date: e.date, value: Number(e.value), meta };
}

function parseHabit(h) {
  return {
    id: h.id,
    name: h.name,
    type: h.type,
    unit: h.unit,
    target: h.target == null ? null : Number(h.target),
    color: h.color || null,
    icon: h.icon || null,
    days: h.days ? h.days.split(',').map(Number) : null,
    goal: h.goal == null ? null : Number(h.goal),
    points: Number(h.points) || 1,
    sort: Number(h.sort),
    archived: Boolean(Number(h.archived)),
    createdAt: Number(h.created_at),
  };
}

async function ownHabit(userId, id) {
  return db('habits').where({ id: Number(id), user_id: userId }).first();
}

/* ---------------- Thói quen ---------------- */

router.get('/habits', async (req, res) => {
  const rows = await db('habits').where({ user_id: req.user.id }).orderBy([{ column: 'archived' }, { column: 'sort' }, { column: 'id' }]);
  res.json({ habits: rows.map(parseHabit) });
});

function validateHabit(body, partial = false) {
  const out = {};
  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name || name.length > 60) return { error: 'Tên thói quen từ 1 đến 60 ký tự.' };
    out.name = name;
  }
  if (!partial || body.type !== undefined) {
    if (!TYPES.includes(body.type)) return { error: 'Loại thói quen không hợp lệ.' };
    out.type = body.type;
  }
  if (body.unit !== undefined) out.unit = body.unit ? String(body.unit).trim().slice(0, 20) : null;
  if (body.target !== undefined) {
    if (body.target === null || body.target === '') out.target = null;
    else {
      const t = Number(body.target);
      if (!Number.isInteger(t) || t < 0 || t > 100000) return { error: 'Mục tiêu phải là số nguyên từ 0.' };
      out.target = t;
    }
  }
  if (body.color !== undefined) {
    if (body.color !== null && !COLORS.includes(body.color)) return { error: 'Màu không hợp lệ.' };
    out.color = body.color;
  }
  if (body.icon !== undefined) {
    if (body.icon !== null && !ICONS.includes(body.icon)) return { error: 'Biểu tượng không hợp lệ.' };
    out.icon = body.icon;
  }
  if (body.days !== undefined) {
    if (body.days === null) out.days = null;
    else {
      const list = Array.isArray(body.days) ? [...new Set(body.days.map(Number))] : null;
      if (!list || !list.length || list.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return { error: 'Lịch lặp không hợp lệ.' };
      out.days = list.length === 7 ? null : list.sort((a, b) => a - b).join(',');
    }
  }
  if (body.goal !== undefined) {
    if (body.goal !== null && !GOALS.includes(Number(body.goal))) return { error: 'Mục tiêu chuỗi không hợp lệ.' };
    out.goal = body.goal === null ? null : Number(body.goal);
  }
  if (body.points !== undefined) {
    if (![1, 2, 3].includes(Number(body.points))) return { error: 'Mức điểm không hợp lệ.' };
    out.points = Number(body.points);
  }
  if (body.archived !== undefined) out.archived = Boolean(body.archived);
  return { data: out };
}

router.post('/habits', async (req, res) => {
  const { error, data } = validateHabit(req.body || {});
  if (error) return bad(res, error);
  const count = await db('habits').where({ user_id: req.user.id, archived: false }).count({ c: '*' }).first();
  if (Number(count.c) >= 30) return bad(res, 'Tối đa 30 thói quen đang theo dõi.');
  const max = await db('habits').where({ user_id: req.user.id }).max({ m: 'sort' }).first();
  const row = {
    user_id: req.user.id,
    name: data.name,
    type: data.type,
    unit: data.type === 'number' ? (data.unit ?? null) : null,
    target: data.type === 'number' ? (data.target ?? null) : null,
    color: data.color ?? null,
    icon: data.icon ?? null,
    days: data.days ?? null,
    goal: data.goal ?? null,
    points: data.points ?? 1,
    sort: (Number(max?.m) || 0) + 1,
    archived: false,
    created_at: Date.now(),
  };
  const [id] = await db('habits').insert(row);
  const created = await db('habits').where({ id: typeof id === 'object' ? id.id : id }).first();
  res.status(201).json({ habit: parseHabit(created) });
});

router.patch('/habits/:id', async (req, res) => {
  const habit = await ownHabit(req.user.id, req.params.id);
  if (!habit) return res.status(404).json({ error: 'Không tìm thấy thói quen.' });
  const { error, data } = validateHabit(req.body || {}, true);
  if (error) return bad(res, error);
  delete data.type; // không đổi loại sau khi tạo để dữ liệu cũ còn đúng nghĩa
  if (Object.keys(data).length) await db('habits').where({ id: habit.id }).update(data);
  const updated = await db('habits').where({ id: habit.id }).first();
  res.json({ habit: parseHabit(updated) });
});

router.post('/habits/reorder', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : null;
  if (!ids || ids.length > 100) return bad(res, 'Danh sách không hợp lệ.');
  await db.transaction(async (trx) => {
    for (let i = 0; i < ids.length; i++) {
      await trx('habits').where({ id: ids[i], user_id: req.user.id }).update({ sort: i });
    }
  });
  res.json({ ok: true });
});

router.delete('/habits/:id', async (req, res) => {
  const habit = await ownHabit(req.user.id, req.params.id);
  if (!habit) return res.status(404).json({ error: 'Không tìm thấy thói quen.' });
  await db.transaction(async (trx) => {
    await trx('entries').where({ habit_id: habit.id }).del();
    await trx('habits').where({ id: habit.id }).del();
  });
  res.json({ ok: true });
});

/* ---------------- Ghi chép theo ngày ---------------- */

router.get('/day/:date', async (req, res) => {
  const { date } = req.params;
  if (!DATE_RE.test(date)) return bad(res, 'Ngày không hợp lệ.');
  const [habits, entries, day] = await Promise.all([
    db('habits').where({ user_id: req.user.id, archived: false }).orderBy([{ column: 'sort' }, { column: 'id' }]),
    db('entries').where({ user_id: req.user.id, date }),
    db('days').where({ user_id: req.user.id, date }).first(),
  ]);
  res.json({
    habits: habits.map(parseHabit),
    entries: entries.map(parseEntry),
    day: day ? { mood: day.mood == null ? null : Number(day.mood), note: day.note || '' } : { mood: null, note: '' },
  });
});

router.put('/entries', async (req, res) => {
  const { habitId, date, value, meta } = req.body || {};
  if (!DATE_RE.test(String(date))) return bad(res, 'Ngày không hợp lệ.');
  const habit = await ownHabit(req.user.id, habitId);
  if (!habit) return res.status(404).json({ error: 'Không tìm thấy thói quen.' });

  if (value === null || value === undefined || value === '') {
    await db('entries').where({ habit_id: habit.id, date }).del();
    return res.json({ entry: null });
  }

  const v = Number(value);
  if (habit.type === 'number') {
    if (!Number.isInteger(v) || v < 0 || v > 100000) return bad(res, 'Giá trị phải là số nguyên từ 0.');
  } else if (v !== 0 && v !== 1) {
    return bad(res, 'Giá trị không hợp lệ.');
  }

  // chỉ lưu chi tiết tái phạm cho thói quen cần tránh khi tái phạm
  const metaStr = habit.type === 'quit' && v === 0 ? cleanMeta(meta) : null;
  const existing = await db('entries').where({ habit_id: habit.id, date }).first();
  if (existing) {
    await db('entries').where({ id: existing.id }).update({ value: v, meta: metaStr });
  } else {
    await db('entries').insert({ user_id: req.user.id, habit_id: habit.id, date, value: v, meta: metaStr });
  }
  const row = await db('entries').where({ habit_id: habit.id, date }).first();
  res.json({ entry: parseEntry(row) });
});

router.put('/day/:date', async (req, res) => {
  const { date } = req.params;
  if (!DATE_RE.test(date)) return bad(res, 'Ngày không hợp lệ.');
  const update = {};
  if (req.body?.mood !== undefined) {
    const m = req.body.mood === null ? null : Number(req.body.mood);
    if (m !== null && (!Number.isInteger(m) || m < 1 || m > 5)) return bad(res, 'Tâm trạng từ 1 đến 5.');
    update.mood = m;
  }
  if (req.body?.note !== undefined) update.note = String(req.body.note || '').slice(0, 2000);

  const existing = await db('days').where({ user_id: req.user.id, date }).first();
  if (existing) await db('days').where({ id: existing.id }).update(update);
  else await db('days').insert({ user_id: req.user.id, date, mood: null, note: null, ...update });
  const row = await db('days').where({ user_id: req.user.id, date }).first();
  res.json({ day: { mood: row.mood == null ? null : Number(row.mood), note: row.note || '' } });
});

/* ---------------- Dữ liệu cho thống kê ---------------- */

router.get('/range', async (req, res) => {
  const { from, to } = req.query;
  if (!DATE_RE.test(String(from)) || !DATE_RE.test(String(to))) return bad(res, 'Khoảng ngày không hợp lệ.');
  const [habits, entries, days] = await Promise.all([
    db('habits').where({ user_id: req.user.id }).orderBy([{ column: 'sort' }, { column: 'id' }]),
    db('entries').where({ user_id: req.user.id }).whereBetween('date', [from, to]),
    db('days').where({ user_id: req.user.id }).whereBetween('date', [from, to]),
  ]);
  res.json({
    habits: habits.map(parseHabit),
    entries: entries.map(parseEntry),
    days: days.map((d) => ({ date: d.date, mood: d.mood == null ? null : Number(d.mood), note: d.note || '' })),
  });
});

/* ---------------- Xuất dữ liệu ---------------- */

router.get('/export', async (req, res) => {
  const [habits, entries, days, notes] = await Promise.all([
    db('habits').where({ user_id: req.user.id }),
    db('entries').where({ user_id: req.user.id }).orderBy('date'),
    db('days').where({ user_id: req.user.id }).orderBy('date'),
    db('notes').where({ user_id: req.user.id }).orderBy('id'),
  ]);
  res.set('Content-Disposition', 'attachment; filename="habit-tracker-export.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    habits: habits.map(parseHabit),
    entries: entries.map(parseEntry),
    days: days.map((d) => ({ date: d.date, mood: d.mood, note: d.note })),
    notes: notes.map((n) => ({
      body: n.body,
      color: n.color || null,
      createdAt: new Date(Number(n.created_at)).toISOString(),
      updatedAt: n.updated_at == null ? null : new Date(Number(n.updated_at)).toISOString(),
    })),
  });
});

module.exports = router;

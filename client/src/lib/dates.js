import { locale, t } from '../i18n';

const pad = (n) => String(n).padStart(2, '0');

export function toKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return toKey(new Date());
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function isValidKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return false;
  return toKey(fromKey(key)) === key;
}

/** Danh sách ngày từ `from` đến `to` (gồm cả hai đầu). */
export function listDays(from, to) {
  const out = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard++ < 4000) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function weekdayName(key) {
  return t('dates.weekdays')[fromKey(key).getDay()];
}

/** vi: "3 tháng 11" · en: "November 3" */
export function dayMonth(key) {
  const d = fromKey(key);
  if (locale.value === 'en') return `${t('dates.months')[d.getMonth()]} ${d.getDate()}`;
  return `${d.getDate()} tháng ${d.getMonth() + 1}`;
}

/** vi: "03/11" · en: "Nov 3" */
export function shortDate(key) {
  const d = fromKey(key);
  if (locale.value === 'en') return `${t('dates.months')[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** vi: "03/11/2026" · en: "Nov 3, 2026" */
export function fullDate(key) {
  const d = fromKey(key);
  if (locale.value === 'en') return `${t('dates.months')[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Thứ hai của tuần chứa `key` (tuần tự nhiên bắt đầu từ thứ hai). */
export function weekStart(key) {
  return addDays(key, -((fromKey(key).getDay() + 6) % 7));
}

/** "08:05" — giờ phút theo đồng hồ 24h ở cả hai ngôn ngữ. */
export function timeOfDay(ms) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

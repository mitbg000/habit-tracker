import { addDays, fromKey, toKey } from './dates';
import { locale, t } from '../i18n';

// Bối cảnh tái phạm lưu trong meta bằng key trung tính; nhãn hiển thị lấy qua t('relapse.<nhóm>.<key>').
export const RELAPSE_TIMES = ['morning', 'afternoon', 'evening', 'late'];
export const RELAPSE_PLACES = ['bed', 'desk', 'bathroom', 'outside', 'other'];
export const RELAPSE_FEELINGS = ['bored', 'stressed', 'lonely', 'tired', 'habit', 'other'];

// Dữ liệu cũ lưu thẳng nhãn tiếng Việt
const LEGACY = {
  time: { Sáng: 'morning', Chiều: 'afternoon', Tối: 'evening', Khuya: 'late' },
  place: { Giường: 'bed', 'Bàn học': 'desk', 'Phòng tắm': 'bathroom', 'Ngoài phòng': 'outside', Khác: 'other' },
  feeling: { Chán: 'bored', 'Căng thẳng': 'stressed', 'Cô đơn': 'lonely', Mệt: 'tired', 'Thói quen': 'habit', Khác: 'other' },
};

/** Đưa giá trị meta (key mới hoặc nhãn tiếng Việt cũ) về key trung tính. */
export function relapseKey(group, value) {
  if (value == null) return value;
  return LEGACY[group][value] || value;
}

/** Nhãn hiển thị; giá trị lạ không có trong danh sách thì giữ nguyên. */
export function relapseLabel(group, value) {
  const k = relapseKey(group, value);
  const label = t(`relapse.${group}.${k}`);
  return label === `relapse.${group}.${k}` ? String(value) : label;
}

/** Trạng thái của một lần ghi: 'ok' | 'fail' | null (chưa ghi). */
export function statusOf(habit, entry) {
  if (!entry) return null;
  if (habit.type === 'number') {
    if (habit.target == null) return 'ok';
    return entry.value <= habit.target ? 'ok' : 'fail';
  }
  return entry.value === 1 ? 'ok' : 'fail';
}

export const MILESTONES = [7, 14, 30, 60, 90, 180, 365];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // thứ hai đến chủ nhật (getDay: 0 = chủ nhật)

/** Ngày `key` có nằm trong lịch lặp của thói quen không (không đặt lịch = mỗi ngày). */
export function isScheduled(habit, key) {
  return !habit.days || habit.days.includes(fromKey(key).getDay());
}

/** Đơn vị đếm chuỗi: thói quen mỗi ngày đếm theo ngày, có lịch riêng thì đếm theo lần. */
export const isDaily = (habit) => !habit.days;

/**
 * Chuỗi liên tiếp tính tới `fromKey`. Ngày ngoài lịch được bỏ qua (không ngắt chuỗi),
 * ngày trong lịch mà chưa ghi thì ngắt, riêng ngày `fromKey` chưa ghi thì chưa tính là ngắt.
 */
export function currentStreak(habit, getEntry, fromKey, maxDays = 365) {
  let day = fromKey;
  let n = 0;
  for (let i = 0; i < maxDays + 7; i += 1) {
    const s = statusOf(habit, getEntry(habit.id, day));
    if (s === 'ok') {
      n += 1;
    } else if (isScheduled(habit, day) && !(day === fromKey && s === null)) {
      break;
    }
    if (n >= maxDays) break;
    day = addDays(day, -1);
  }
  return n;
}

/** Chuỗi dài nhất trong khoảng ngày đã nạp. */
export function bestStreak(habit, getEntry, days) {
  let best = 0;
  let run = 0;
  for (const day of days) {
    if (statusOf(habit, getEntry(habit.id, day)) === 'ok') {
      run += 1;
      best = Math.max(best, run);
    } else if (isScheduled(habit, day)) {
      run = 0;
    }
  }
  return best;
}

/** Hôm đó thói quen có phải ghi không: đúng lịch, chưa lưu trữ, đã tạo; hôm nay chỉ tính khi `pending`. */
export function habitDueOn(habit, key, today, pending = false) {
  if (habit.archived || !isScheduled(habit, key)) return false;
  if (key < toKey(new Date(habit.createdAt))) return false;
  return key < today || (pending && key === today);
}

/**
 * Điểm của một ngày: điểm đạt / tổng điểm các thói quen phải ghi hoặc đã ghi hôm đó.
 * Ngày đã qua mà không ghi tính 0 điểm; hôm nay chưa ghi thì chưa tính, trừ khi `pending`.
 */
export function dayScore(habits, getEntry, key, today, pending = false) {
  let earned = 0;
  let max = 0;
  for (const h of habits) {
    const entry = getEntry(h.id, key);
    if (!entry && !habitDueOn(h, key, today, pending)) continue;
    max += h.points || 1;
    if (statusOf(h, entry) === 'ok') earned += h.points || 1;
  }
  return { earned, max };
}

export function average(list) {
  if (!list.length) return null;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

export function formatDecimal(n, digits = 1) {
  const s = n.toFixed(digits);
  return locale.value === 'vi' ? s.replace('.', ',') : s;
}

/** Gom đếm theo nhãn, xếp giảm dần. */
export function countBy(values) {
  const map = new Map();
  for (const v of values) if (v) map.set(v, (map.get(v) || 0) + 1);
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

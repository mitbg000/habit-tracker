import {
  Check, Ban, Hash, Dumbbell, Bike, Footprints, BookOpen, Brain, Droplets, Moon,
  Sun, Coffee, Heart, Smartphone, Apple, DoorOpen, Pill, Leaf, Timer, Music,
} from 'lucide-vue-next';

// Bảng màu bão hoà thấp, mỗi màu khác hẳn sắc độ để dễ phân biệt: fg cho icon/thanh, bg cho nền chip.
export const PALETTE = {
  slate: { fg: '#51668a', bg: '#d9e0ec' },
  sky: { fg: '#4a86a8', bg: '#d4e6f0' },
  teal: { fg: '#439089', bg: '#d0e7e4' },
  olive: { fg: '#7a8a3c', bg: '#e3e8cc' },
  sand: { fg: '#a08440', bg: '#efe4c8' },
  clay: { fg: '#a8715a', bg: '#f0ddd3' },
  lavender: { fg: '#7a6fa8', bg: '#e1ddef' },
  stone: { fg: '#6f6f6f', bg: '#e2e2e2' },
};
export const COLOR_KEYS = Object.keys(PALETTE);

export const ICONS = {
  check: Check, ban: Ban, hash: Hash, dumbbell: Dumbbell, bike: Bike, footprints: Footprints,
  book: BookOpen, brain: Brain, droplets: Droplets, moon: Moon, sun: Sun, coffee: Coffee,
  heart: Heart, phone: Smartphone, apple: Apple, door: DoorOpen, pill: Pill, leaf: Leaf,
  timer: Timer, music: Music,
};
export const ICON_KEYS = Object.keys(ICONS);

const DEFAULT_ICON = { build: 'check', quit: 'ban', number: 'hash' };

/** Màu/icon của thói quen; chưa chọn thì tự gán theo id (màu) và theo loại (icon). */
export function habitStyle(habit) {
  const color = PALETTE[habit.color] ? habit.color : COLOR_KEYS[(Number(habit.id) || 0) % COLOR_KEYS.length];
  const icon = ICONS[habit.icon] ? habit.icon : DEFAULT_ICON[habit.type] || 'check';
  return { colorKey: color, iconKey: icon, ...PALETTE[color], icon: ICONS[icon] };
}

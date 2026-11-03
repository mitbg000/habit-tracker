<script setup>
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { t } from '../i18n';
import { addDays, fromKey } from '../lib/dates';

// progress(key) -> { done, total }
const props = defineProps({
  selected: { type: String, required: true },
  today: { type: String, required: true },
  progress: { type: Function, required: true },
});
const emit = defineEmits(['select', 'shift']);

// Cửa sổ 7 ngày: kết thúc ở hôm nay, hoặc lùi theo ngày đang xem nếu đã đi xa
const end = computed(() => {
  if (props.selected >= addDays(props.today, -6)) return props.today;
  const e = addDays(props.selected, 3);
  return e > props.today ? props.today : e;
});
const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const key = addDays(end.value, i - 6);
    const d = fromKey(key);
    const { done, total } = props.progress(key);
    return {
      key,
      weekday: t('dates.weekdaysShort')[d.getDay()],
      num: d.getDate(),
      pct: total ? Math.round((done / total) * 100) : 0,
      complete: total > 0 && done >= total,
    };
  }),
);

const nav =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted outline-hidden transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';
</script>

<template>
  <div class="flex items-center gap-1 rounded-2xl border border-border bg-surface p-1.5">
    <button type="button" :class="nav" :aria-label="t('today.prevWeek')" @click="emit('shift', -7)">
      <ChevronLeft class="size-4" aria-hidden="true" />
    </button>

    <div class="grid min-w-0 flex-1 grid-cols-7 gap-1">
      <button
        v-for="d in days"
        :key="d.key"
        type="button"
        :aria-pressed="d.key === selected"
        :aria-current="d.key === today ? 'date' : undefined"
        class="flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-xl px-0.5 py-2 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-focus"
        :class="d.key === selected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-item-hover'"
        @click="emit('select', d.key)"
      >
        <span class="text-[11px] leading-none" :class="d.key === selected ? 'text-primary-foreground/70' : 'text-muted'">{{ d.weekday }}</span>
        <span class="text-sm leading-none font-semibold tabular-nums">{{ d.num }}</span>
        <!-- Tiến độ trong ngày: thanh nhỏ, đủ hết thì đặc -->
        <span class="h-1 w-5 overflow-hidden rounded-full" :class="d.key === selected ? 'bg-primary-foreground/25' : 'bg-foreground/10'">
          <span
            class="block h-full rounded-full"
            :class="d.key === selected ? 'bg-primary-foreground' : 'bg-primary'"
            :style="{ width: d.pct + '%' }"
          />
        </span>
      </button>
    </div>

    <button type="button" :class="nav" :disabled="end >= today" :aria-label="t('today.nextWeek')" @click="emit('shift', 7)">
      <ChevronRight class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>

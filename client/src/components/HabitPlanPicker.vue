<script setup>
import { WEEK_ORDER, MILESTONES } from '../lib/stats';
import { t } from '../i18n';

// days: null = mỗi ngày, hoặc mảng thứ trong tuần (0 = chủ nhật). goal: null hoặc số ngày/lần của mốc.
const props = defineProps({ days: Array, goal: Number, points: { type: Number, default: 1 } });
const emit = defineEmits(['update:days', 'update:goal', 'update:points']);

function toggleDay(d) {
  const cur = props.days ? [...props.days] : [];
  const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
  // Rỗng hoặc đủ 7 ngày thì quay về mỗi ngày
  emit('update:days', next.length === 0 || next.length === 7 ? null : next);
}

const chip =
  'h-8 cursor-pointer rounded-full px-3 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-focus';
const on = 'bg-primary text-primary-foreground';
const off = 'bg-background text-foreground hover:bg-button-hover';
</script>

<template>
  <div class="flex flex-col gap-4">
    <fieldset>
      <legend class="mb-2 text-sm font-medium">{{ t('habits.importance') }}</legend>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in [1, 2, 3]"
          :key="p"
          type="button"
          :aria-pressed="points === p"
          :class="[chip, points === p ? on : off]"
          @click="emit('update:points', p)"
        >
          {{ t(`habits.levels.${p}`) }}
        </button>
      </div>
    </fieldset>

    <fieldset>
      <legend class="mb-2 text-sm font-medium">{{ t('habits.schedule') }}</legend>
      <div class="flex flex-wrap gap-2">
        <button type="button" :aria-pressed="!days" :class="[chip, !days ? on : off]" @click="emit('update:days', null)">
          {{ t('habits.everyDay') }}
        </button>
        <button
          v-for="d in WEEK_ORDER"
          :key="d"
          type="button"
          :aria-pressed="Boolean(days?.includes(d))"
          :aria-label="t('dates.weekdays')[d]"
          :class="[chip, 'min-w-10 px-2.5', days?.includes(d) ? on : off]"
          @click="toggleDay(d)"
        >
          {{ t('dates.weekdaysShort')[d] }}
        </button>
      </div>
    </fieldset>

    <fieldset>
      <legend class="mb-2 text-sm font-medium">{{ t('habits.goal') }}</legend>
      <div class="flex flex-wrap gap-2">
        <button type="button" :aria-pressed="!goal" :class="[chip, !goal ? on : off]" @click="emit('update:goal', null)">
          {{ t('habits.noGoal') }}
        </button>
        <button
          v-for="m in MILESTONES"
          :key="m"
          type="button"
          :aria-pressed="goal === m"
          :class="[chip, goal === m ? on : off]"
          @click="emit('update:goal', m)"
        >
          {{ t(`milestones.${m}`) }}
        </button>
      </div>
    </fieldset>
  </div>
</template>

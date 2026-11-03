<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Angry, Frown, Meh, Smile, Laugh } from 'lucide-vue-next';
import DayStrip from '../components/DayStrip.vue';
import HabitRow from '../components/HabitRow.vue';
import BaseButton from '../components/BaseButton.vue';
import { api } from '../api';
import { useFreshData } from '../lib/freshData';
import { addDays, todayKey, isValidKey, weekdayName, dayMonth } from '../lib/dates';
import { currentStreak, isScheduled, dayScore, statusOf } from '../lib/stats';
import { t } from '../i18n';

const HISTORY_DAYS = 370; // đủ để đếm chuỗi tới mốc 1 năm
const route = useRoute();
const router = useRouter();

const today = todayKey();
const dateKey = computed(() => {
  const q = String(route.query.d || '');
  return isValidKey(q) && q <= today ? q : today;
});
const isToday = computed(() => dateKey.value === today);

const loading = ref(true);
const loadError = ref('');
const saveError = ref('');
const saveState = ref('idle'); // idle | saving | saved
const habits = ref([]);
const entries = reactive({}); // `${habitId}|${date}` -> { value, meta }
const day = reactive({ mood: null, note: '' });
const dayData = reactive({}); // date -> { mood, note }

const key = (habitId, date) => `${habitId}|${date}`;
const getEntry = (habitId, date) => entries[key(habitId, date)];

const activeHabits = computed(() => habits.value.filter((h) => !h.archived));
// Thói quen có lịch riêng chỉ hiện vào ngày có lịch (hoặc ngày đã lỡ ghi)
const dueHabits = computed(() =>
  activeHabits.value.filter((h) => isScheduled(h, dateKey.value) || getEntry(h.id, dateKey.value)),
);

// Nạp từ xa về trước tới hôm nay rồi giữ lại, nên chuyển giữa các ngày đã nạp không cần gọi máy chủ
let loadedFrom = null;
const isLoaded = (date) => loadedFrom && addDays(date, -HISTORY_DAYS) >= loadedFrom;

function showDay() {
  const d = dayData[dateKey.value];
  day.mood = d ? d.mood : null;
  day.note = d ? d.note : '';
}

async function load(silent = false) {
  if (!silent) {
    loading.value = true;
    loadError.value = '';
  }
  try {
    // Nạp dư 90 ngày để lùi về các ngày gần đó không phải gọi lại
    const need = addDays(dateKey.value, -(HISTORY_DAYS + 90));
    const from = loadedFrom && loadedFrom < need ? loadedFrom : need;
    const data = await api.get(`/range?from=${from}&to=${today}`);
    habits.value = data.habits;
    for (const k of Object.keys(entries)) delete entries[k];
    for (const e of data.entries) entries[key(e.habitId, e.date)] = { value: e.value, meta: e.meta };
    for (const k of Object.keys(dayData)) delete dayData[k];
    for (const d of data.days) dayData[d.date] = { mood: d.mood, note: d.note };
    loadedFrom = from;
    showDay();
  } catch (err) {
    if (!silent) loadError.value = err.message;
  } finally {
    loading.value = false;
  }
}

load();
watch(dateKey, () => (isLoaded(dateKey.value) ? showDay() : load()));
useFreshData(() => {
  if (saveState.value !== 'saving') load(true);
});

function select(key) {
  router.replace({ name: 'today', query: key >= today ? {} : { d: key } });
}
function go(offset) {
  const next = addDays(dateKey.value, offset);
  select(next > today ? today : next);
}

/* ---------- lưu ---------- */
let savedTimer;
function markSaving() {
  clearTimeout(savedTimer);
  saveState.value = 'saving';
  saveError.value = '';
}
function markSaved() {
  saveState.value = 'saved';
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (saveState.value = 'idle'), 1800);
}
function markFailed(err) {
  saveState.value = 'idle';
  saveError.value = err.message;
}
onBeforeUnmount(() => clearTimeout(savedTimer));

async function setEntry(habit, value, meta) {
  const k = key(habit.id, dateKey.value);
  const previous = entries[k];
  const date = dateKey.value;

  if (value === null) delete entries[k];
  else entries[k] = { value, meta: value === 0 && habit.type === 'quit' ? meta : null };

  markSaving();
  try {
    await api.put('/entries', { habitId: habit.id, date, value, meta });
    markSaved();
  } catch (err) {
    if (previous) entries[k] = previous;
    else delete entries[k];
    markFailed(err);
  }
}

async function saveDay(patch) {
  markSaving();
  const before = { mood: day.mood, note: day.note };
  const date = dateKey.value;
  Object.assign(day, patch);
  dayData[date] = { ...before, ...patch };
  try {
    await api.put(`/day/${date}`, patch);
    markSaved();
  } catch (err) {
    dayData[date] = before;
    if (date === dateKey.value) Object.assign(day, before);
    markFailed(err);
  }
}

function setMood(n) {
  saveDay({ mood: day.mood === n ? null : n });
}

const noteDraft = ref('');
watch(() => day.note, (n) => (noteDraft.value = n), { immediate: true });
function commitNote() {
  if (noteDraft.value !== day.note) saveDay({ note: noteDraft.value });
}

/* ---------- hiển thị ---------- */
// Điểm trong ngày trên đúng các thói quen đang hiện
const score = computed(() => {
  let earned = 0;
  let max = 0;
  for (const h of dueHabits.value) {
    max += h.points || 1;
    if (statusOf(h, getEntry(h.id, dateKey.value)) === 'ok') earned += h.points || 1;
  }
  return { earned, max };
});
const streakOf = (habit) => currentStreak(habit, getEntry, dateKey.value, HISTORY_DAYS);

const MOOD_ICONS = [Angry, Frown, Meh, Smile, Laugh];
const MOODS = computed(() => t('today.moods').map((label, i) => ({ v: i + 1, label, icon: MOOD_ICONS[i] })));
const moodLabel = computed(() => MOODS.value.find((m) => m.v === day.mood)?.label || '');

// Điểm của một ngày trong thanh 7 ngày
function progressOf(key) {
  const { earned, max } = dayScore(activeHabits.value, getEntry, key, today, true);
  return { done: earned, total: max };
}
const progressPct = computed(() => (score.value.max ? Math.round((score.value.earned / score.value.max) * 100) : 0));
</script>

<template>
  <div class="flex w-full max-w-3xl flex-col gap-4">
    <!-- Đầu trang -->
    <div class="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold">{{ isToday ? t('dates.today') : weekdayName(dateKey) }}</h1>
        <p class="mt-1 text-sm text-muted">
          {{ isToday ? weekdayName(dateKey) + ', ' : '' }}{{ dayMonth(dateKey) }}
        </p>
      </div>
      <BaseButton v-if="!isToday" @click="select(today)">{{ t('today.backToToday') }}</BaseButton>
    </div>

    <DayStrip :selected="dateKey" :today="today" :progress="progressOf" @select="select" @shift="go" />

    <p
      v-if="saveError"
      role="alert"
      class="rounded-xl border border-sage/30 bg-sage/10 p-4 text-sm font-medium text-sage-fg"
    >
      {{ t('today.notSaved', { msg: saveError }) }}
    </p>

    <p v-if="loadError" role="alert" class="rounded-xl border border-sage/30 bg-sage/10 p-4 text-sm text-sage-fg">
      {{ loadError }}
      <button type="button" class="ml-1 cursor-pointer font-medium underline underline-offset-2" @click="load()">{{ t('common.retry') }}</button>
    </p>

    <template v-else>
      <!-- Thói quen -->
      <section class="rounded-2xl border border-border bg-surface py-5" aria-labelledby="h-habits">
        <header class="px-4 pb-2 sm:px-5">
          <div class="flex items-baseline justify-between gap-3">
            <h2 id="h-habits" class="text-base font-semibold">{{ t('today.habits') }}</h2>
            <p class="text-sm text-muted tabular-nums" aria-live="polite">
              <template v-if="saveState === 'saving'">{{ t('common.saving') }}</template>
              <template v-else-if="saveState === 'saved'">{{ t('common.saved') }}</template>
              <template v-else>{{ t('today.points', { n: score.earned, max: score.max }) }}</template>
            </p>
          </div>
          <div
            v-if="!loading && dueHabits.length"
            class="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/5"
            role="progressbar"
            :aria-valuenow="score.earned"
            aria-valuemin="0"
            :aria-valuemax="score.max"
            :aria-label="t('today.points', { n: score.earned, max: score.max })"
          >
            <div class="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" :style="{ width: progressPct + '%' }" />
          </div>
        </header>

        <p v-if="loading" class="py-6 text-center text-sm text-muted">{{ t('common.loading') }}</p>
        <p v-else-if="activeHabits.length && !dueHabits.length" class="py-6 text-center text-sm text-muted">{{ t('today.restDay') }}</p>
        <p v-else-if="!activeHabits.length" class="py-6 text-center text-sm text-muted">
          {{ t('today.emptyBefore') }}
          <RouterLink to="/thoi-quen" class="font-medium text-foreground underline underline-offset-2">{{ t('nav.habits') }}</RouterLink>.
        </p>
        <ul v-else class="divide-y divide-border">
          <HabitRow
            v-for="h in dueHabits"
            :key="h.id"
            :habit="h"
            :entry="getEntry(h.id, dateKey)"
            :streak="streakOf(h)"
            :streak-cap="365"
            @set="(v, m) => setEntry(h, v, m)"
          />
        </ul>
      </section>

      <!-- Tâm trạng và ghi chú -->
      <section v-if="!loading" class="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="h-mood">
        <div class="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="h-mood" class="text-base font-semibold">{{ t('today.mood') }}</h2>
          <p class="text-sm text-muted" aria-live="polite">{{ moodLabel }}</p>
        </div>

        <div role="group" :aria-label="t('today.moodGroup')" class="grid grid-cols-5 gap-2">
          <button
            v-for="m in MOODS"
            :key="m.v"
            type="button"
            :aria-pressed="day.mood === m.v"
            :aria-label="m.label"
            :title="m.label"
            class="flex h-12 cursor-pointer items-center justify-center rounded-xl border outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-focus"
            :class="
              day.mood === m.v
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border-strong bg-surface text-muted hover:bg-button-hover hover:text-foreground'
            "
            @click="setMood(m.v)"
          >
            <component :is="m.icon" class="size-6" aria-hidden="true" />
          </button>
        </div>

        <textarea
          id="day-note"
          v-model="noteDraft"
          rows="2"
          maxlength="2000"
          :aria-label="t('today.dayNote')"
          :placeholder="t('today.dayNotePh')"
          class="mt-3 w-full resize-y rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-base outline-hidden transition-colors placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus md:text-sm"
          @blur="commitNote"
        />
      </section>
    </template>
  </div>
</template>

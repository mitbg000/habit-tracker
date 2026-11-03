<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { api } from '../api';
import { useFreshData } from '../lib/freshData';
import { t } from '../i18n';
import HabitIcon from '../components/HabitIcon.vue';
import PeriodMenu from '../components/PeriodMenu.vue';
import MilestoneBadge from '../components/MilestoneBadge.vue';
import { habitStyle } from '../lib/habitStyle';
import { addDays, todayKey, listDays, shortDate, fullDate, toKey, weekStart } from '../lib/dates';
import {
  statusOf, currentStreak, bestStreak, average, formatDecimal, countBy, dayScore, habitDueOn, relapseKey, relapseLabel, isScheduled, MILESTONES,
} from '../lib/stats';

const LOAD_DAYS = 370; // nạp sẵn đủ để tính huy hiệu tới mốc 1 năm; khoảng dài hơn được nạp thêm khi chọn

const today = todayKey();
const range = ref({ preset: '30' }); // khoảng đang hiển thị (dữ liệu đã nạp xong)
const rangeLoading = ref(false);
const loadedFrom = ref(addDays(today, -(LOAD_DAYS - 1)));
let allLoaded = false;
const loading = ref(true);
const error = ref('');
const habits = ref([]);
const entries = reactive({});
const moods = reactive({}); // date -> mood

const getEntry = (habitId, date) => entries[`${habitId}|${date}`];

function fill(data) {
  for (const e of data.entries) entries[`${e.habitId}|${e.date}`] = { value: e.value, meta: e.meta };
  for (const d of data.days) if (d.mood != null) moods[d.date] = d.mood;
}

async function load(silent = false) {
  if (!silent) {
    loading.value = true;
    error.value = '';
  }
  try {
    const data = await api.get(`/range?from=${loadedFrom.value}&to=${today}`);
    habits.value = data.habits;
    for (const k of Object.keys(entries)) delete entries[k];
    for (const k of Object.keys(moods)) delete moods[k];
    fill(data);
  } catch (err) {
    if (!silent) error.value = err.message;
  } finally {
    loading.value = false;
  }
}
load();
useFreshData(() => load(true));

/* ---------- khoảng thời gian ---------- */
// Ngày sớm nhất có dữ liệu (cho "Tất cả")
const earliestKey = computed(() => {
  let min = today;
  for (const h of habits.value) {
    const k = toKey(new Date(h.createdAt));
    if (k < min) min = k;
  }
  for (const k of Object.keys(entries)) {
    const d = k.slice(k.indexOf('|') + 1);
    if (d < min) min = d;
  }
  for (const d of Object.keys(moods)) if (d < min) min = d;
  return min;
});

const rangeStart = computed(() => {
  const r = range.value;
  if (r.preset === 'custom') return r.from;
  if (r.preset === 'all') return earliestKey.value;
  return addDays(today, -(Number(r.preset) - 1));
});
const rangeEnd = computed(() => (range.value.preset === 'custom' ? range.value.to : today));

const days = computed(() => listDays(rangeStart.value, rangeEnd.value));
// Khung biểu đồ cột: khoảng tới hôm nay thì kéo tiếp hết tuần, phần chưa tới hiện màu xám
const frameEnd = computed(() => (rangeEnd.value === today ? addDays(weekStart(today), 6) : rangeEnd.value));
// Toàn bộ phần lịch sử đã nạp, dùng cho huy hiệu
const allDays = computed(() => listDays(loadedFrom.value, today));

async function loadEarlier(from) {
  const to = addDays(loadedFrom.value, -1);
  if (from > to) return;
  const data = await api.get(`/range?from=${from}&to=${to}`);
  fill(data);
  const dates = [...data.entries.map((e) => e.date), ...data.days.map((d) => d.date)].sort();
  loadedFrom.value = dates.length && dates[0] < from ? dates[0] : from;
}

async function setRange(next) {
  rangeLoading.value = true;
  try {
    if (next.preset === 'all') {
      if (!allLoaded) {
        await loadEarlier('2000-01-01');
        allLoaded = true;
      }
    } else {
      const from = next.preset === 'custom' ? next.from : addDays(today, -(Number(next.preset) - 1));
      if (from < loadedFrom.value) await loadEarlier(from);
    }
    range.value = next;
  } catch (err) {
    error.value = err.message;
  } finally {
    rangeLoading.value = false;
  }
}

// Chỉ hiện thói quen đang theo dõi, hoặc đã lưu trữ nhưng có dữ liệu trong kỳ
const shownHabits = computed(() =>
  habits.value.filter((h) => !h.archived || days.value.some((d) => getEntry(h.id, d))),
);

/* ---------- ô số liệu ---------- */
const summary = computed(() => {
  let earned = 0;
  let max = 0;
  let relapses = 0;
  const loggedDays = new Set();
  for (const d of days.value) {
    const info = infoOf(d);
    earned += info.earned;
    max += info.max;
    relapses += info.relapses;
    if (info.logged || moods[d] != null) loggedDays.add(d);
  }
  const moodList = days.value.map((d) => moods[d]).filter((m) => m != null);
  return {
    earned,
    max,
    logged: loggedDays.size,
    relapses,
    mood: average(moodList),
    moodDays: moodList.length,
  };
});

/* ---------- theo từng thói quen ---------- */
// Một chấm trong dải ngày: đạt tô đặc màu thói quen, không đạt tô nhạt, chưa ghi xám, ngày nghỉ theo lịch xám nhạt hơn
function habitCell(h, key) {
  const e = getEntry(h.id, key);
  const st = statusOf(h, e);
  const fg = habitStyle(h).fg;
  let value = t('stats.notLogged');
  if (st && h.type === 'number') value = `${e.value} ${h.unit || ''}`.trim();
  else if (st) value = t(`row.${h.type === 'quit' ? 'quit' : 'build'}${st === 'ok' ? 'Ok' : 'Fail'}`);
  return {
    key,
    title: `${fullDate(key)}: ${value}`,
    style: st ? { backgroundColor: fg, opacity: st === 'ok' ? 1 : 0.3 } : undefined,
    empty: !st && (isScheduled(h, key) ? 'bg-foreground/5' : 'bg-foreground/[0.025]'),
  };
}

const habitStats = computed(() =>
  shownHabits.value.map((h) => {
    let ok = 0;
    let total = 0;
    for (const d of days.value) {
      const entry = getEntry(h.id, d);
      if (entry || habitDueOn(h, d, today)) total += 1;
      if (statusOf(h, entry) === 'ok') ok += 1;
    }
    const bestAll = bestStreak(h, getEntry, allDays.value);
    return {
      habit: h,
      ok,
      total,
      earned: ok * (h.points || 1),
      max: total * (h.points || 1),
      streak: currentStreak(h, getEntry, today, LOAD_DAYS),
      best: bestStreak(h, getEntry, days.value),
      bestAll,
      topMilestone: MILESTONES.filter((m) => m <= bestAll).pop() ?? null,
      cells: days.value.map((d) => habitCell(h, d)),
    };
  }),
);

/* ---------- tổng quan ---------- */
// Số liệu gộp mọi thói quen của từng ngày trong khoảng đang xem
const dayInfo = computed(() => {
  const map = new Map();
  for (const d of days.value) {
    let relapses = 0;
    let logged = false;
    for (const h of shownHabits.value) {
      const e = getEntry(h.id, d);
      if (e) logged = true;
      if (h.type === 'quit' && e && e.value === 0) relapses += 1;
    }
    map.set(d, { ...dayScore(shownHabits.value, getEntry, d, today), relapses, logged });
  }
  return map;
});
const infoOf = (key) => dayInfo.value.get(key) || { earned: 0, max: 0, relapses: 0, logged: false };

/* ---------- biểu đồ điểm theo ngày ---------- */
const trend = computed(() =>
  listDays(rangeStart.value, frameEnd.value).map((key) => ({
    key,
    start: key,
    future: key > today,
    partial: key === today, // hôm nay chưa kết thúc
    earned: infoOf(key).earned,
    max: infoOf(key).max,
  })),
);
// Mọi cột dùng chung thang: ngày có tổng điểm cao nhất là cột cao nhất
const trendScale = computed(() => Math.max(1, ...trend.value.map((b) => b.max)));

const bucketLabel = (b) => shortDate(b.start);
function bucketValue(b) {
  return b.max ? t('today.points', { n: b.earned, max: b.max }) : t(b.future ? 'stats.future' : 'stats.notLogged');
}
function bucketTitle(b) {
  return `${fullDate(b.start)}: ${bucketValue(b)}`;
}
// Quá nhiều cột thì chỉ ghi nhãn thưa ra và bỏ số trên đầu cột
const labelStep = computed(() => (trend.value.length > 62 ? 14 : Math.ceil(trend.value.length / 8)));
const dense = computed(() => trend.value.length > 14);
// Khoảng dài: giữ cỡ cột tối thiểu, cuộn ngang trong thẻ và mở ra ở ngày mới nhất
const barsMinWidth = computed(() => `${trend.value.length * 4}px`);
const barScroller = ref(null);
const stripScrollers = ref([]);
// Dải chấm: mỗi chấm rộng tối thiểu 4px (cộng khe 2px), khoảng dài cuộn ngang
const stripMinWidth = computed(() => `${days.value.length * 6}px`);
watch([() => trend.value.length, loading], async () => {
  await nextTick();
  for (const el of [barScroller.value, ...stripScrollers.value]) {
    if (el) el.scrollLeft = el.scrollWidth;
  }
});

/* ---------- bối cảnh tái phạm ---------- */
const relapseMetas = computed(() => {
  const out = [];
  for (const h of shownHabits.value) {
    if (h.type !== 'quit') continue;
    for (const d of days.value) {
      const e = getEntry(h.id, d);
      if (e && e.value === 0) out.push(e.meta || {});
    }
  }
  return out;
});
// Đếm theo key trung tính (gộp cả dữ liệu cũ lưu nhãn tiếng Việt), nhãn dịch lúc hiển thị
const countGroup = (group) =>
  countBy(relapseMetas.value.map((m) => relapseKey(group, m[group]))).map((r) => ({ ...r, label: relapseLabel(group, r.label) }));
const byTime = computed(() => countGroup('time'));
const byPlace = computed(() => countGroup('place'));
const byFeeling = computed(() => countGroup('feeling'));
const contextGroups = computed(() => [
  { t: t('stats.groupTime'), d: byTime.value },
  { t: t('stats.groupPlace'), d: byPlace.value },
  { t: t('stats.groupFeeling'), d: byFeeling.value },
]);
const topPattern = computed(() => {
  const parts = [byTime.value[0], byPlace.value[0], byFeeling.value[0]].filter(Boolean);
  if (!parts.length || relapseMetas.value.length < 3) return '';
  return parts.map((p) => p.label.toLowerCase()).join(' · ');
});

/* ---------- liên hệ với tâm trạng ---------- */
const moodLinks = computed(() => {
  const out = [];
  for (const h of shownHabits.value) {
    if (h.type !== 'build') continue;
    const yes = [];
    const no = [];
    for (const d of days.value) {
      const m = moods[d];
      const s = statusOf(h, getEntry(h.id, d));
      if (m == null || !s) continue;
      (s === 'ok' ? yes : no).push(m);
    }
    if (yes.length >= 3 && no.length >= 3) {
      out.push({ name: h.name, yes: average(yes), no: average(no), yesN: yes.length, noN: no.length });
    }
  }
  return out;
});

</script>

<template>
  <div class="flex w-full max-w-6xl flex-col gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold">{{ t('nav.stats') }}</h1>
      </div>

      <PeriodMenu :model-value="range" :today="today" @update:model-value="setRange" />
    </div>

    <p v-if="error" role="alert" class="rounded-xl border border-sage/30 bg-sage/10 p-4 text-sm text-sage-fg">
      {{ error }}
      <button type="button" class="ml-1 cursor-pointer font-medium underline underline-offset-2" @click="load()">{{ t('common.retry') }}</button>
    </p>
    <p v-else-if="loading" class="py-6 text-center text-sm text-muted">{{ t('common.loading') }}</p>

    <template v-else>
      <div class="flex flex-col gap-4 transition-opacity" :class="rangeLoading && 'pointer-events-none opacity-50'" :aria-busy="rangeLoading || undefined">
      <!-- Tổng quan: số liệu gọn + điểm từng ngày -->
      <section class="overflow-hidden rounded-2xl border border-border bg-surface" aria-labelledby="h-overview">
        <div class="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
          <div class="min-w-0 bg-surface px-4 py-3 sm:px-5">
            <p class="text-xs font-medium text-muted">{{ t('stats.rate') }}</p>
            <p class="mt-0.5 text-lg font-semibold tracking-tight text-foreground tabular-nums">{{ summary.max ? summary.earned : '—' }}<span v-if="summary.max" class="text-sm font-normal text-muted"> / {{ summary.max }}</span></p>
          </div>
          <div class="min-w-0 bg-surface px-4 py-3 sm:px-5">
            <p class="text-xs font-medium text-muted">{{ t('stats.loggedDays') }}</p>
            <p class="mt-0.5 text-lg font-semibold tracking-tight text-foreground tabular-nums">{{ summary.logged }}<span class="text-sm font-normal text-muted"> / {{ days.length }}</span></p>
          </div>
          <div class="min-w-0 bg-surface px-4 py-3 sm:px-5">
            <p class="text-xs font-medium text-muted">{{ t('stats.relapses') }}</p>
            <p class="mt-0.5 text-lg font-semibold tracking-tight text-foreground tabular-nums">{{ summary.relapses }}</p>
          </div>
          <div class="min-w-0 bg-surface px-4 py-3 sm:px-5">
            <p class="text-xs font-medium text-muted">{{ t('stats.avgMood') }}</p>
            <p class="mt-0.5 text-lg font-semibold tracking-tight text-foreground tabular-nums">{{ summary.mood == null ? '—' : formatDecimal(summary.mood) }}<span class="text-sm font-normal text-muted"> / 5</span></p>
          </div>
        </div>

        <div class="p-4 sm:p-5">
          <h2 id="h-overview" class="mb-4 text-base font-semibold">{{ t('stats.overview') }}</h2>

          <!-- Cột xám là số điểm tối đa của ngày, phần xanh là điểm đạt được -->
          <div ref="barScroller" class="overflow-x-auto pb-1">
            <div :style="{ minWidth: barsMinWidth }">
              <div
                class="flex h-44 items-end"
                :class="dense ? 'gap-px' : 'gap-2 sm:gap-3'"
                role="img"
                :aria-label="t('stats.trendAria', { list: trend.filter((b) => !b.future).map(bucketValue).join(', ') })"
              >
                <div v-for="b in trend" :key="b.key" class="flex h-full min-w-0 flex-1 flex-col justify-end gap-2" :title="bucketTitle(b)">
                  <p v-if="!dense" class="text-center text-xs font-medium text-muted tabular-nums">{{ b.max ? b.earned : '\u00a0' }}</p>
                  <div
                    class="relative mx-auto w-full overflow-hidden bg-foreground/5"
                    :class="dense ? 'max-w-none rounded-t-[2px]' : 'max-w-8 rounded-t-md'"
                    :style="{ height: `calc((100% - ${dense ? '0rem' : '1.5rem'}) * ${(b.max || trendScale) / trendScale})` }"
                  >
                    <div
                      v-if="b.earned"
                      class="absolute inset-x-0 bottom-0"
                      :class="b.partial ? 'bg-chart-fill/50' : 'bg-chart-fill'"
                      :style="{ height: (b.earned / b.max) * 100 + '%' }"
                    />
                  </div>
                </div>
              </div>
              <div class="mt-3 flex border-t border-border pt-3" :class="dense ? 'gap-px' : 'gap-2 sm:gap-3'">
                <p v-for="(b, i) in trend" :key="b.key" class="min-w-0 flex-1 text-center text-xs whitespace-nowrap text-muted">
                  <span v-if="i % labelStep === 0" class="inline-block">{{ bucketLabel(b) }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Từng thói quen -->
      <section class="rounded-2xl border border-border bg-surface py-5" aria-labelledby="h-each">
        <header class="px-5 pb-1.5">
          <h2 id="h-each" class="text-base font-semibold">{{ t('stats.each') }}</h2>
        </header>

        <p v-if="!habitStats.length" class="py-6 text-center text-sm text-muted">{{ t('stats.eachEmpty') }}</p>
        <ul v-else class="divide-y divide-border">
          <li v-for="s in habitStats" :key="s.habit.id" class="px-5 py-4">
            <div class="flex items-center justify-between gap-3">
              <HabitIcon :habit="s.habit" />
              <p class="min-w-0 flex-1 text-sm font-medium text-pretty">{{ s.habit.name }}</p>
              <MilestoneBadge
                v-if="s.topMilestone"
                compact
                earned
                :m="s.topMilestone"
                :fg="habitStyle(s.habit).fg"
                :bg="habitStyle(s.habit).bg"
              />
              <p class="shrink-0 text-sm font-medium tabular-nums">{{ s.max ? t('today.points', { n: s.earned, max: s.max }) : '—' }}</p>
            </div>
            <!-- Mỗi chấm là một ngày trong khoảng đã chọn, cũ bên trái, mới bên phải -->
            <div ref="stripScrollers" class="mt-3 overflow-x-auto">
              <div class="flex items-center gap-0.5" :style="{ minWidth: stripMinWidth }" role="img" :aria-label="`${s.habit.name}: ${s.ok}/${s.total}`">
                <span v-for="c in s.cells" :key="c.key" class="flex min-w-0 flex-1 justify-center" :title="c.title">
                  <span class="aspect-square w-full max-w-3.5 rounded-full" :class="c.empty" :style="c.style" />
                </span>
              </div>
            </div>
            <p class="mt-2 text-xs text-muted tabular-nums">
              {{ t('stats.eachLine', { ok: s.ok, total: s.total, streak: s.streak, best: s.best }) }}
            </p>
          </li>
        </ul>
      </section>

      <div class="grid items-start gap-4 lg:grid-cols-2">
        <!-- Bối cảnh tái phạm -->
        <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="h-context">
          <h2 id="h-context" class="text-base font-semibold">{{ t('stats.context') }}</h2>
          <p v-if="!summary.relapses" class="mt-4 text-sm text-muted">{{ t('stats.contextEmpty') }}</p>
          <template v-else>
            <p class="mt-1 text-sm text-muted">
              <template v-if="topPattern">{{ t('stats.topPattern') }} <span class="font-medium text-foreground">{{ topPattern }}</span></template>
              <template v-else>{{ t('stats.contextMore') }}</template>
            </p>

            <div v-for="group in contextGroups" :key="group.t" class="mt-5">
              <p class="mb-2 text-xs font-medium text-muted">{{ group.t }}</p>
              <p v-if="!group.d.length" class="text-sm text-muted">{{ t('stats.noData') }}</p>
              <ul v-else class="flex flex-col gap-3">
                <li v-for="row in group.d" :key="row.label">
                  <div class="flex items-baseline justify-between gap-3 text-sm">
                    <span class="min-w-0 truncate">{{ row.label }}</span>
                    <span class="shrink-0 font-medium tabular-nums">{{ row.count }}</span>
                  </div>
                  <div class="mt-1.5 h-2 rounded-full bg-foreground/5">
                    <div class="h-2 rounded-full bg-primary" :style="{ width: (row.count / group.d[0].count) * 100 + '%' }" />
                  </div>
                </li>
              </ul>
            </div>
          </template>
        </section>

        <!-- Liên hệ với tâm trạng -->
        <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="h-link">
          <h2 id="h-link" class="text-base font-semibold">{{ t('stats.link') }}</h2>
          <p v-if="!moodLinks.length" class="mt-4 text-sm text-muted">
            {{ t('stats.linkEmpty') }}
          </p>
          <ul v-else class="mt-4 flex flex-col divide-y divide-border">
            <li v-for="l in moodLinks" :key="l.name" class="py-3 first:pt-0 last:pb-0">
              <p class="text-sm font-medium text-pretty">{{ l.name }}</p>
              <div class="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
                <div class="bg-surface p-3">
                  <p class="text-xs text-muted">{{ t('stats.yesDays', { n: l.yesN }) }}</p>
                  <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatDecimal(l.yes) }}</p>
                </div>
                <div class="bg-surface p-3">
                  <p class="text-xs text-muted">{{ t('stats.noDays', { n: l.noN }) }}</p>
                  <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatDecimal(l.no) }}</p>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </div>
      </div>
    </template>
  </div>
</template>

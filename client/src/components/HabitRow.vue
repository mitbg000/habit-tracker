<script setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import { Check, X, ChevronDown } from 'lucide-vue-next';
import { RELAPSE_TIMES, RELAPSE_PLACES, RELAPSE_FEELINGS, relapseKey } from '../lib/stats';
import { t } from '../i18n';
import HabitIcon from './HabitIcon.vue';
import { habitStyle } from '../lib/habitStyle';

const props = defineProps({
  habit: { type: Object, required: true },
  entry: Object, // { value, meta } hoặc undefined
  streak: { type: Number, default: 0 },
  streakCap: { type: Number, default: 180 },
});
const emit = defineEmits(['set']);

const value = computed(() => (props.entry ? props.entry.value : null));

/* ---------- build / quit: hai lựa chọn rõ ràng, bấm lại để bỏ chọn ---------- */
const labels = computed(() =>
  props.habit.type === 'quit' ? { fail: t('row.quitFail'), ok: t('row.quitOk') } : { fail: t('row.buildFail'), ok: t('row.buildOk') },
);

function choose(v) {
  emit('set', value.value === v ? null : v, null);
}

/* ---------- chi tiết lần tái phạm ---------- */
const meta = computed(() => props.entry?.meta || {});
// Dữ liệu cũ có thể lưu nhãn tiếng Việt: quy về key trung tính để so sánh và ghi lại
const picked = computed(() => ({
  time: relapseKey('time', meta.value.time),
  place: relapseKey('place', meta.value.place),
  feeling: relapseKey('feeling', meta.value.feeling),
}));
const groups = [
  { key: 'time', legend: 'row.when', options: RELAPSE_TIMES },
  { key: 'place', legend: 'row.where', options: RELAPSE_PLACES },
  { key: 'feeling', legend: 'row.feeling', options: RELAPSE_FEELINGS },
];
const isRelapse = computed(() => props.habit.type === 'quit' && value.value === 0);

function setMeta(key, val) {
  const next = { ...meta.value, ...picked.value };
  if (next[key] === val) delete next[key];
  else next[key] = val;
  for (const k of ['time', 'place', 'feeling']) if (next[k] == null) delete next[k];
  emit('set', 0, next);
}

const note = ref(meta.value.note || '');
watch(
  () => props.entry?.meta?.note,
  (n) => {
    if (n !== note.value) note.value = n || '';
  },
);
let noteTimer;
function onNote(e) {
  note.value = e.target.value;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    const next = { ...meta.value };
    if (note.value.trim()) next.note = note.value.trim();
    else delete next.note;
    emit('set', 0, next);
  }, 700);
}
onBeforeUnmount(() => clearTimeout(noteTimer));

/* ---------- number ---------- */
const draft = ref(value.value == null ? '' : String(value.value));
watch(value, (v) => {
  draft.value = v == null ? '' : String(v);
});

function commitNumber() {
  const raw = String(draft.value).trim();
  if (raw === '') {
    if (value.value !== null) emit('set', null, null);
    return;
  }
  const n = Math.min(100000, Math.max(0, Math.round(Number(raw))));
  if (Number.isNaN(n)) {
    draft.value = value.value == null ? '' : String(value.value);
    return;
  }
  draft.value = String(n);
  if (n !== value.value) emit('set', n, null);
}

function addNumber(step) {
  const next = Math.min(100000, (value.value || 0) + step);
  draft.value = String(next);
  emit('set', next, null);
}

const overTarget = computed(
  () => props.habit.type === 'number' && props.habit.target != null && value.value != null && value.value > props.habit.target,
);

const streakText = computed(() => {
  const times = Boolean(props.habit.days);
  const goal = props.habit.goal;
  if (goal && props.streak < goal) return t('row.goalProgress', { n: props.streak, goal, times });
  if (!props.streak) return '';
  const n = props.streak >= props.streakCap ? `${props.streakCap}+` : props.streak;
  const text = t('row.streak', { n, times });
  return goal ? `${text} · ${t('row.goalDone')}` : text;
});

/* ---------- bối cảnh tái phạm: thu gọn, mở ra khi cần ---------- */
const contextOpen = ref(false);
const summary = computed(() =>
  groups
    .filter((g) => picked.value[g.key])
    .map((g) => t(`relapse.${g.key}.${picked.value[g.key]}`))
    .join(' · '),
);
</script>

<template>
  <li class="px-4 py-3.5 sm:px-5">
    <div class="grid grid-cols-1 items-center gap-x-4 gap-y-3 min-[360px]:grid-cols-[minmax(0,1fr)_auto]">
      <div class="flex min-w-0 items-center gap-3">
        <HabitIcon :habit="habit" />
        <div class="min-w-0">
        <p class="text-sm font-medium text-pretty">{{ habit.name }}</p>
        <p class="mt-0.5 text-xs text-muted">
          <template v-if="habit.type === 'number'">
            <span v-if="habit.target != null">{{ t('row.targetMax', { n: habit.target, unit: habit.unit || '' }).trim() }}</span>
            <span v-else>{{ habit.unit || t('row.measure') }}</span>
            <span v-if="streakText"> · {{ streakText }}</span>
          </template>
          <template v-else>{{ streakText }}</template>
        </p>
        </div>
      </div>

      <!-- build / quit: chỉ có icon, chọn thì icon đậm hơn và lên màu; bấm lại để bỏ chọn -->
      <div v-if="habit.type !== 'number'" role="group" :aria-label="habit.name" class="flex shrink-0 gap-1">
        <button
          type="button"
          :aria-pressed="value === 0"
          :aria-label="labels.fail"
          :title="labels.fail"
          class="flex size-10 cursor-pointer items-center justify-center rounded-xl outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-focus"
          :class="value === 0 ? 'text-sage-fg' : 'text-foreground/25 hover:text-foreground/60'"
          @click="choose(0)"
        >
          <X class="size-6 transition-transform" :class="value === 0 && 'scale-110'" :stroke-width="value === 0 ? 3 : 2" aria-hidden="true" />
        </button>
        <button
          type="button"
          :aria-pressed="value === 1"
          :aria-label="labels.ok"
          :title="labels.ok"
          class="flex size-10 cursor-pointer items-center justify-center rounded-xl outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-focus"
          :class="value !== 1 && 'text-foreground/25 hover:text-foreground/60'"
          :style="value === 1 ? { color: habitStyle(habit).fg } : undefined"
          @click="choose(1)"
        >
          <Check class="size-6 transition-transform" :class="value === 1 && 'scale-110'" :stroke-width="value === 1 ? 3 : 2" aria-hidden="true" />
        </button>
      </div>

      <!-- number -->
      <div v-else class="flex items-center gap-2">
        <input
          v-model="draft"
          type="number"
          inputmode="numeric"
          min="0"
          :aria-label="`${habit.name} (${habit.unit || t('row.number')})`"
          placeholder="0"
          class="h-11 w-24 rounded-xl border bg-surface px-4 text-base outline-hidden transition-colors placeholder:text-muted md:h-10 md:text-sm"
          :class="
            overTarget
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/10'
              : 'border-border-strong focus:border-focus focus:ring-2 focus:ring-focus'
          "
          @blur="commitNumber"
          @keydown.enter="$event.target.blur()"
        />
        <span class="text-sm text-muted">{{ habit.unit }}</span>
        <button
          type="button"
          class="h-8 cursor-pointer rounded-lg border border-border-strong bg-surface px-2.5 text-sm font-medium outline-hidden transition-colors hover:bg-button-hover"
          @click="addNumber(15)"
        >
          +15
        </button>
      </div>
    </div>

    <p v-if="overTarget" class="mt-2 text-xs text-red-600">{{ t('row.overTarget', { n: value - habit.target, unit: habit.unit || '' }) }}</p>

    <!-- Bối cảnh khi tái phạm: một dòng tóm tắt, bấm để mở -->
    <div v-if="isRelapse" class="mt-3 rounded-xl bg-background">
      <button
        type="button"
        :aria-expanded="contextOpen"
        class="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-focus"
        @click="contextOpen = !contextOpen"
      >
        <span class="truncate" :class="summary ? 'text-foreground' : 'text-muted'">{{ summary || t('row.addContext') }}</span>
        <ChevronDown class="size-4 shrink-0 text-muted transition-transform" :class="contextOpen && 'rotate-180'" aria-hidden="true" />
      </button>

      <div v-if="contextOpen" class="flex flex-col gap-3 px-3 pb-3">
        <fieldset v-for="g in groups" :key="g.key" class="min-w-0">
          <legend class="mb-1.5 text-xs font-medium text-muted">{{ t(g.legend) }}</legend>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="o in g.options"
              :key="o"
              type="button"
              :aria-pressed="picked[g.key] === o"
              class="h-7 cursor-pointer rounded-full px-2.5 text-xs outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-focus"
              :class="picked[g.key] === o ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground hover:bg-button-hover'"
              @click="setMeta(g.key, o)"
            >
              {{ t(`relapse.${g.key}.${o}`) }}
            </button>
          </div>
        </fieldset>

        <input
          :value="note"
          type="text"
          maxlength="200"
          :aria-label="t('row.shortNote')"
          :placeholder="t('row.shortNotePh')"
          class="h-11 w-full rounded-xl border border-border-strong bg-surface px-4 text-base outline-hidden transition-colors placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus md:h-10 md:text-sm"
          @input="onNote"
        />
      </div>
    </div>
  </li>
</template>

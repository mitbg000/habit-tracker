<script setup>
import { ref, computed, onMounted } from 'vue';
import { ArrowUp, ArrowDown, Pencil, Archive, ArchiveRestore, Trash2, Plus } from 'lucide-vue-next';
import BaseField from '../components/BaseField.vue';
import BaseButton from '../components/BaseButton.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import HabitIcon from '../components/HabitIcon.vue';
import HabitStylePicker from '../components/HabitStylePicker.vue';
import HabitPlanPicker from '../components/HabitPlanPicker.vue';
import { WEEK_ORDER } from '../lib/stats';
import { api } from '../api';
import { useFreshData } from '../lib/freshData';
import { t } from '../i18n';

const TYPES = ['build', 'quit', 'number'];
const typeLabel = (type) => t(`habits.types.${type}.label`);
const scheduleText = (h) => WEEK_ORDER.filter((d) => h.days.includes(d)).map((d) => t('dates.weekdaysShort')[d]).join(', ');

const loading = ref(true);
const error = ref('');
const habits = ref([]);

const active = computed(() => habits.value.filter((h) => !h.archived));
const archived = computed(() => habits.value.filter((h) => h.archived));

async function load(silent = false) {
  if (!silent) {
    loading.value = true;
    error.value = '';
  }
  try {
    habits.value = (await api.get('/habits')).habits;
  } catch (err) {
    if (!silent) error.value = err.message;
  } finally {
    loading.value = false;
  }
}
onMounted(() => load());
useFreshData(() => {
  if (!editingId.value) load(true);
});

/* ---------- thêm ---------- */
const blankForm = () => ({ name: '', type: 'build', unit: t('habits.defaultUnit'), target: '', color: null, icon: null, days: null, goal: null, points: 1 });
const form = ref(blankForm());
const addOpen = ref(false); // form thêm chỉ hiện sau khi bấm nút

function openAdd() {
  form.value = blankForm();
  formErrors.value = { name: '', target: '' };
  addError.value = '';
  addOpen.value = true;
}
const formErrors = ref({ name: '', target: '' });
const adding = ref(false);
const addError = ref('');

function targetValue(v) {
  const s = String(v ?? '').trim();
  return s === '' ? null : Number(s);
}

function validate(f) {
  const e = { name: '', target: '' };
  if (!f.name.trim()) e.name = t('habits.errName');
  else if (f.name.trim().length > 60) e.name = t('habits.errNameLong');
  if (f.type === 'number') {
    const t = targetValue(f.target);
    if (t !== null && (!Number.isInteger(t) || t < 0)) e.target = t('habits.errTarget');
  }
  return e;
}

async function add() {
  if (adding.value) return;
  addError.value = '';
  formErrors.value = validate(form.value);
  if (formErrors.value.name || formErrors.value.target) return;
  adding.value = true;
  try {
    const f = form.value;
    const { habit } = await api.post('/habits', {
      name: f.name.trim(),
      type: f.type,
      color: f.color,
      icon: f.icon,
      days: f.days,
      goal: f.goal,
      points: f.points,
      ...(f.type === 'number' ? { unit: f.unit.trim() || null, target: targetValue(f.target) } : {}),
    });
    habits.value.push(habit);
    form.value = blankForm();
    addOpen.value = false;
  } catch (err) {
    addError.value = err.message;
  } finally {
    adding.value = false;
  }
}

/* ---------- sửa ---------- */
const editingId = ref(null);
const edit = ref({ name: '', unit: '', target: '' });
const editErrors = ref({ name: '', target: '' });
const saving = ref(false);
const rowError = ref('');

function startEdit(h) {
  editingId.value = h.id;
  edit.value = { name: h.name, unit: h.unit || '', target: h.target ?? '', type: h.type, color: h.color, icon: h.icon, days: h.days, goal: h.goal, points: h.points };
  editErrors.value = { name: '', target: '' };
  rowError.value = '';
}

async function saveEdit(h) {
  editErrors.value = validate(edit.value);
  if (editErrors.value.name || editErrors.value.target) return;
  saving.value = true;
  rowError.value = '';
  try {
    const body = { name: edit.value.name.trim(), color: edit.value.color, icon: edit.value.icon, days: edit.value.days, goal: edit.value.goal, points: edit.value.points };
    if (h.type === 'number') {
      body.unit = edit.value.unit.trim() || null;
      body.target = targetValue(edit.value.target);
    }
    const { habit } = await api.patch(`/habits/${h.id}`, body);
    Object.assign(h, habit);
    editingId.value = null;
  } catch (err) {
    rowError.value = err.message;
  } finally {
    saving.value = false;
  }
}

/* ---------- lưu trữ, sắp xếp, xoá ---------- */
async function toggleArchive(h) {
  rowError.value = '';
  try {
    const { habit } = await api.patch(`/habits/${h.id}`, { archived: !h.archived });
    Object.assign(h, habit);
  } catch (err) {
    rowError.value = err.message;
  }
}

async function move(index, dir) {
  const list = active.value;
  const j = index + dir;
  if (j < 0 || j >= list.length) return;
  const ids = list.map((h) => h.id);
  [ids[index], ids[j]] = [ids[j], ids[index]];
  const before = habits.value.slice();
  const order = [...ids, ...archived.value.map((h) => h.id)];
  habits.value = order.map((id) => habits.value.find((h) => h.id === id));
  try {
    await api.post('/habits/reorder', { ids: order });
  } catch (err) {
    habits.value = before;
    rowError.value = err.message;
  }
}

const toDelete = ref(null);
const deleting = ref(false);
async function confirmDelete() {
  deleting.value = true;
  try {
    await api.del(`/habits/${toDelete.value.id}`);
    habits.value = habits.value.filter((h) => h.id !== toDelete.value.id);
    toDelete.value = null;
  } catch (err) {
    rowError.value = err.message;
    toDelete.value = null;
  } finally {
    deleting.value = false;
  }
}

const iconBtn =
  'inline-flex size-10 cursor-pointer items-center justify-center rounded-xl text-muted outline-hidden transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50';
</script>

<template>
  <div class="flex w-full max-w-3xl flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="min-w-0 text-xl font-semibold">{{ t('nav.habits') }}</h1>
      <BaseButton v-if="!addOpen" variant="primary" size="form" @click="openAdd">
        <template #icon><Plus class="size-4 shrink-0" aria-hidden="true" /></template>
        {{ t('habits.add') }}
      </BaseButton>
    </div>

    <p v-if="error" role="alert" class="rounded-xl border border-sage/30 bg-sage/10 p-4 text-sm text-sage-fg">
      {{ error }}
      <button type="button" class="ml-1 cursor-pointer font-medium underline underline-offset-2" @click="load()">{{ t('common.retry') }}</button>
    </p>
    <p v-if="rowError" role="alert" class="rounded-xl border border-sage/30 bg-sage/10 p-4 text-sm text-sage-fg">{{ rowError }}</p>

    <!-- Thêm mới -->
    <section v-if="addOpen" class="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="h-add">
      <h2 id="h-add" class="mb-4 text-base font-semibold">{{ t('habits.add') }}</h2>
      <form class="flex flex-col gap-2" novalidate @submit.prevent="add">
        <BaseField v-model="form.name" :label="t('habits.name')" :placeholder="t('habits.namePh')" maxlength="60" :error="formErrors.name" autofocus />

        <fieldset class="mb-2">
          <legend class="mb-2 text-sm font-medium">{{ t('habits.type') }}</legend>
          <div class="flex flex-col gap-3">
            <label
              v-for="type in TYPES"
              :key="type"
              class="flex cursor-pointer items-start gap-3 rounded-xl border border-border-strong bg-surface p-4 transition-colors hover:bg-surface-hover has-checked:border-focus has-checked:ring-2 has-checked:ring-focus"
            >
              <input
                v-model="form.type"
                type="radio"
                name="habit-type"
                :value="type"
                class="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-border-strong bg-surface outline-hidden checked:border-[6px] checked:border-primary"
              />
              <span class="min-w-0">
                <span class="block text-sm font-medium">{{ typeLabel(type) }}</span>
                <span class="mt-1 block text-sm text-muted">{{ t(`habits.types.${type}.hint`) }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <HabitPlanPicker v-model:days="form.days" v-model:goal="form.goal" v-model:points="form.points" />
        <HabitStylePicker v-model:color="form.color" v-model:icon="form.icon" class="mb-2" />

        <div v-if="form.type === 'number'" class="grid grid-cols-2 gap-3">
          <BaseField v-model="form.unit" :label="t('habits.unit')" :placeholder="t('habits.unitPh')" maxlength="20" />
          <BaseField
            v-model="form.target"
            :label="t('habits.max')"
            inputmode="numeric"
            :placeholder="t('habits.maxPh')"
            :hint="t('habits.maxHint')"
            :error="formErrors.target"
          />
        </div>

        <p v-if="addError" role="alert" class="text-sm text-red-600">{{ addError }}</p>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <BaseButton variant="secondary" size="form" @click="addOpen = false">{{ t('common.cancel') }}</BaseButton>
          <BaseButton type="submit" variant="primary" size="form" :loading="adding">{{ t('habits.add') }}</BaseButton>
        </div>
      </form>
    </section>

    <!-- Danh sách đang theo dõi -->
    <section class="rounded-2xl border border-border bg-surface py-5" aria-labelledby="h-active">
      <header class="px-5 pb-1.5">
        <h2 id="h-active" class="text-base font-semibold">{{ t('habits.active') }}</h2>
      </header>

      <p v-if="loading" class="py-6 text-center text-sm text-muted">{{ t('common.loading') }}</p>
      <p v-else-if="!active.length" class="py-6 text-center text-sm text-muted">{{ t('habits.noActive') }}</p>
      <ul v-else class="divide-y divide-border">
        <li v-for="(h, i) in active" :key="h.id" class="px-5 py-3">
          <!-- Chế độ sửa -->
          <form v-if="editingId === h.id" class="flex flex-col gap-2 py-1" novalidate @submit.prevent="saveEdit(h)">
            <BaseField v-model="edit.name" :label="t('habits.name')" :error="editErrors.name" maxlength="60" autofocus />
            <div v-if="h.type === 'number'" class="grid grid-cols-2 gap-3">
              <BaseField v-model="edit.unit" :label="t('habits.unit')" maxlength="20" />
              <BaseField v-model="edit.target" :label="t('habits.max')" inputmode="numeric" :placeholder="t('habits.maxPh')" :error="editErrors.target" />
            </div>
            <HabitPlanPicker v-model:days="edit.days" v-model:goal="edit.goal" v-model:points="edit.points" />
            <HabitStylePicker v-model:color="edit.color" v-model:icon="edit.icon" class="mb-2" />
            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <BaseButton variant="secondary" size="form" @click="editingId = null">{{ t('common.cancel') }}</BaseButton>
              <BaseButton type="submit" variant="primary" size="form" :loading="saving">{{ t('common.save') }}</BaseButton>
            </div>
          </form>

          <!-- Chế độ xem -->
          <div v-else class="flex items-center gap-3">
            <HabitIcon :habit="h" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-pretty">{{ h.name }}</p>
              <p class="mt-0.5 text-xs text-muted">
                {{ typeLabel(h.type) }}<template v-if="h.type === 'number'"> · {{ h.unit || t('row.number') }}<template v-if="h.target != null">{{ t('habits.maxShort', { n: h.target }) }}</template></template><template v-if="h.days"> · {{ scheduleText(h) }}</template> · {{ t('habits.pointsShort', { n: h.points }) }}<template v-if="h.goal"> · {{ t('habits.goalShort', { m: t(`milestones.${h.goal}`) }) }}</template>
              </p>
            </div>
            <div class="flex shrink-0 items-center">
              <button type="button" :class="iconBtn" :aria-label="t('habits.moveUp')" :disabled="i === 0" @click="move(i, -1)">
                <ArrowUp class="size-4" aria-hidden="true" />
              </button>
              <button type="button" :class="iconBtn" :aria-label="t('habits.moveDown')" :disabled="i === active.length - 1" @click="move(i, 1)">
                <ArrowDown class="size-4" aria-hidden="true" />
              </button>
              <button type="button" :class="iconBtn" :aria-label="t('common.edit')" @click="startEdit(h)">
                <Pencil class="size-4" aria-hidden="true" />
              </button>
              <button type="button" :class="iconBtn" :aria-label="t('habits.archive')" @click="toggleArchive(h)">
                <Archive class="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- Đã lưu trữ -->
    <section v-if="archived.length" class="rounded-2xl border border-border bg-surface py-5" aria-labelledby="h-archived">
      <header class="px-5 pb-1.5">
        <h2 id="h-archived" class="text-base font-semibold">{{ t('habits.archived') }}</h2>
      </header>
      <ul class="divide-y divide-border">
        <li v-for="h in archived" :key="h.id" class="flex items-center gap-3 px-5 py-3">
          <HabitIcon :habit="h" class="opacity-60" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-muted text-pretty">{{ h.name }}</p>
            <p class="mt-0.5 text-xs text-muted">{{ typeLabel(h.type) }}</p>
          </div>
          <button type="button" :class="iconBtn" :aria-label="t('habits.restore')" @click="toggleArchive(h)">
            <ArchiveRestore class="size-4" aria-hidden="true" />
          </button>
          <button type="button" :class="[iconBtn, 'hover:text-sage-fg']" :aria-label="t('habits.deleteForever')" @click="toDelete = h">
            <Trash2 class="size-4" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </section>

    <ConfirmDialog
      :open="Boolean(toDelete)"
      :title="t('habits.deleteTitle')"
      :name="toDelete?.name"
      :message="t('habits.deleteMessage')"
      :confirm-label="t('habits.deleteConfirm')"
      :loading="deleting"
      @cancel="toDelete = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

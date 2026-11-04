<script setup>
import { ref, computed, watch } from 'vue';
import { Pencil, Trash2 } from 'lucide-vue-next';
import BaseButton from './BaseButton.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { api } from '../api';
import { t } from '../i18n';

const MAX_LEN = 120;
const POINTS = [1, 2, 3];

const props = defineProps({
  date: { type: String, required: true },
  tasks: { type: Array, required: true },
});
// change(date, updater): trả về ngày gốc vì người dùng có thể đã chuyển ngày khi yêu cầu chưa xong
const emit = defineEmits(['change']);

const error = ref('');
const earned = computed(() => props.tasks.reduce((sum, task) => sum + task.points, 0));

/* ---------- thêm ---------- */
const draft = ref('');
const draftPoints = ref(1);
const adding = ref(false);
const draftEl = ref(null);

async function add() {
  if (adding.value) return;
  const title = draft.value.trim();
  error.value = '';
  if (!title) {
    error.value = t('tasks.errEmpty');
    draftEl.value?.focus();
    return;
  }
  const date = props.date;
  adding.value = true;
  try {
    const { task } = await api.post('/tasks', { date, title, points: draftPoints.value });
    emit('change', date, (list) => [...list, task]);
    draft.value = '';
    draftPoints.value = 1;
    draftEl.value?.focus();
  } catch (err) {
    error.value = err.message;
  } finally {
    adding.value = false;
  }
}

/* ---------- sửa tại chỗ ---------- */
const editingId = ref(null);
const editTitle = ref('');
const editPoints = ref(1);
const saving = ref(false);

function startEdit(task) {
  editingId.value = task.id;
  editTitle.value = task.title;
  editPoints.value = task.points;
  error.value = '';
}
function cancelEdit() {
  editingId.value = null;
}

async function saveEdit() {
  if (saving.value) return;
  const title = editTitle.value.trim();
  error.value = '';
  if (!title) {
    error.value = t('tasks.errEmpty');
    return;
  }
  const date = props.date;
  saving.value = true;
  try {
    const { task } = await api.patch(`/tasks/${editingId.value}`, { title, points: editPoints.value });
    emit('change', date, (list) => list.map((x) => (x.id === task.id ? task : x)));
    editingId.value = null;
  } catch (err) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
}

watch(() => props.date, () => {
  editingId.value = null;
  error.value = '';
});

/* ---------- xoá ---------- */
const removing = ref(null);
const removeLoading = ref(false);

async function confirmRemove() {
  const task = removing.value;
  removeLoading.value = true;
  error.value = '';
  try {
    await api.del(`/tasks/${task.id}`);
    emit('change', task.date, (list) => list.filter((x) => x.id !== task.id));
  } catch (err) {
    error.value = err.message;
  } finally {
    removeLoading.value = false;
    removing.value = null;
  }
}

const input =
  'h-11 w-full min-w-0 rounded-xl border border-border-strong bg-surface px-4 text-base outline-hidden transition-colors placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus md:h-10 md:text-sm';
const chip =
  'size-9 cursor-pointer rounded-full text-sm tabular-nums outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-focus md:size-8';
const on = 'bg-primary text-primary-foreground';
const off = 'bg-background text-foreground hover:bg-button-hover';
const iconBtn =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted outline-hidden transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus md:size-8';
</script>

<template>
  <section class="rounded-2xl border border-border bg-surface py-5" aria-labelledby="h-tasks">
    <header class="flex items-baseline justify-between gap-3 px-4 pb-3 sm:px-5">
      <h2 id="h-tasks" class="text-base font-semibold">{{ t('tasks.title') }}</h2>
      <p v-if="tasks.length" class="text-sm text-muted tabular-nums">{{ t('tasks.earned', { n: earned }) }}</p>
    </header>

    <ul v-if="tasks.length" class="mb-3 divide-y divide-border border-y border-border">
      <li v-for="task in tasks" :key="task.id" class="px-4 py-2.5 sm:px-5">
        <form v-if="editingId === task.id" class="flex flex-col gap-2 sm:flex-row sm:items-center" @submit.prevent="saveEdit">
          <input
            v-model="editTitle"
            type="text"
            :maxlength="MAX_LEN"
            :aria-label="t('tasks.name')"
            :class="input"
            @keydown.esc="cancelEdit"
          />
          <div class="flex items-center justify-between gap-3 sm:contents">
            <div role="group" :aria-label="t('tasks.pointsGroup')" class="flex shrink-0 gap-1">
              <button
                v-for="p in POINTS"
                :key="p"
                type="button"
                :aria-pressed="editPoints === p"
                :aria-label="t('tasks.pointsValue', { n: p })"
                :class="[chip, editPoints === p ? on : off]"
                @click="editPoints = p"
              >
                {{ p }}
              </button>
            </div>
            <div class="flex shrink-0 gap-2">
              <BaseButton variant="secondary" size="form" @click="cancelEdit">{{ t('common.cancel') }}</BaseButton>
              <BaseButton type="submit" variant="primary" size="form" :loading="saving">{{ t('common.save') }}</BaseButton>
            </div>
          </div>
        </form>

        <div v-else class="flex items-center gap-2">
          <p class="min-w-0 flex-1 text-sm break-words text-pretty">{{ task.title }}</p>
          <p class="shrink-0 text-sm font-medium text-muted tabular-nums">{{ t('tasks.earned', { n: task.points }) }}</p>
          <button type="button" :class="iconBtn" :aria-label="t('tasks.edit')" :title="t('tasks.edit')" @click="startEdit(task)">
            <Pencil class="size-4" aria-hidden="true" />
          </button>
          <button type="button" :class="iconBtn" :aria-label="t('tasks.remove')" :title="t('tasks.remove')" @click="removing = task">
            <Trash2 class="size-4" aria-hidden="true" />
          </button>
        </div>
      </li>
    </ul>

    <form class="flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:px-5" @submit.prevent="add">
      <input
        ref="draftEl"
        v-model="draft"
        type="text"
        :maxlength="MAX_LEN"
        :aria-label="t('tasks.name')"
        :placeholder="t('tasks.placeholder')"
        :class="input"
      />
      <div class="flex items-center justify-between gap-3 sm:contents">
        <div role="group" :aria-label="t('tasks.pointsGroup')" class="flex shrink-0 gap-1">
          <button
            v-for="p in POINTS"
            :key="p"
            type="button"
            :aria-pressed="draftPoints === p"
            :aria-label="t('tasks.pointsValue', { n: p })"
            :class="[chip, draftPoints === p ? on : off]"
            @click="draftPoints = p"
          >
            {{ p }}
          </button>
        </div>
        <BaseButton type="submit" variant="primary" size="form" :loading="adding" class="shrink-0">{{ t('tasks.add') }}</BaseButton>
      </div>
    </form>

    <p v-if="error" role="alert" class="mt-2 px-4 text-sm text-sage-fg sm:px-5">{{ error }}</p>

    <ConfirmDialog
      :open="Boolean(removing)"
      :title="t('tasks.removeTitle')"
      :name="removing?.title"
      :message="t('tasks.removeMsg')"
      :confirm-label="t('tasks.removeConfirm')"
      :loading="removeLoading"
      @confirm="confirmRemove"
      @cancel="removing = null"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { Search, X, Pencil, Trash2, NotebookPen } from 'lucide-vue-next';
import BaseButton from '../components/BaseButton.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import NoteColorPicker from '../components/NoteColorPicker.vue';
import { PALETTE } from '../lib/habitStyle';
import { api } from '../api';
import { t } from '../i18n';
import { toKey, todayKey, addDays, weekdayName, dayMonth, timeOfDay } from '../lib/dates';

const PAGE = 10;
const MAX_LEN = 5000;

const notes = ref([]); // mới nhất trước
const hasMore = ref(false);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref('');
const actionError = ref('');

/* ---------- tải và tìm kiếm ---------- */
const query = ref('');
const activeQuery = ref(''); // từ khoá của danh sách đang hiện
let searchTimer;
let requestSeq = 0; // bỏ kết quả của lần tải cũ nếu người dùng đã gõ tiếp

function notesUrl(before) {
  const params = new URLSearchParams({ limit: String(PAGE) });
  if (before) params.set('before', String(before));
  if (activeQuery.value) params.set('q', activeQuery.value);
  return `/notes?${params}`;
}

async function load() {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    const data = await api.get(notesUrl());
    if (seq !== requestSeq) return;
    notes.value = data.notes;
    hasMore.value = data.hasMore;
  } catch (err) {
    if (seq === requestSeq) error.value = err.message;
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value || !notes.value.length) return;
  const seq = requestSeq;
  loadingMore.value = true;
  actionError.value = '';
  try {
    const data = await api.get(notesUrl(notes.value[notes.value.length - 1].id));
    if (seq !== requestSeq) return;
    notes.value.push(...data.notes);
    hasMore.value = data.hasMore;
  } catch (err) {
    actionError.value = err.message;
  } finally {
    loadingMore.value = false;
  }
}

watch(query, (q) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const next = q.trim();
    if (next === activeQuery.value) return;
    activeQuery.value = next;
    load();
  }, 300);
});

function clearSearch() {
  query.value = '';
  clearTimeout(searchTimer);
  if (activeQuery.value) {
    activeQuery.value = '';
    load();
  }
}

load();
onBeforeUnmount(() => clearTimeout(searchTimer));

/* ---------- soạn mới ---------- */
const draft = ref('');
const draftColor = ref(null);
const tint = (color) => (PALETTE[color] ? { backgroundColor: PALETTE[color].bg } : undefined);
const composeError = ref('');
const posting = ref(false);
const composeEl = ref(null);

async function post() {
  if (posting.value) return;
  const body = draft.value.trim();
  composeError.value = '';
  if (!body) {
    composeError.value = t('notes.errEmpty');
    composeEl.value?.focus();
    return;
  }
  posting.value = true;
  try {
    const { note } = await api.post('/notes', { body, color: draftColor.value });
    draft.value = '';
    // Đang lọc mà ghi chú mới không khớp thì thôi không chèn vào danh sách
    if (!activeQuery.value || note.body.toLowerCase().includes(activeQuery.value.toLowerCase())) {
      notes.value.unshift(note);
    }
  } catch (err) {
    composeError.value = err.message;
  } finally {
    posting.value = false;
  }
}

function onComposeKeydown(e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    post();
  }
}

/* ---------- sửa tại chỗ ---------- */
const editingId = ref(null);
const editDraft = ref('');
const editColor = ref(null);
const editError = ref('');
const saving = ref(false);
const editEls = ref([]);

async function startEdit(note) {
  editingId.value = note.id;
  editDraft.value = note.body;
  editColor.value = note.color;
  editError.value = '';
  await nextTick();
  const el = editEls.value[0];
  if (el) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}

function cancelEdit() {
  editingId.value = null;
}

async function saveEdit(note) {
  if (saving.value) return;
  const body = editDraft.value.trim();
  editError.value = '';
  if (!body) {
    editError.value = t('notes.errEmpty');
    return;
  }
  if (body === note.body && editColor.value === note.color) {
    editingId.value = null;
    return;
  }
  saving.value = true;
  try {
    const { note: updated } = await api.patch(`/notes/${note.id}`, { body, color: editColor.value });
    Object.assign(note, updated);
    editingId.value = null;
  } catch (err) {
    editError.value = err.message;
  } finally {
    saving.value = false;
  }
}

function onEditKeydown(e, note) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    saveEdit(note);
  } else if (e.key === 'Escape') {
    cancelEdit();
  }
}

/* ---------- xoá ---------- */
const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
  deleting.value = true;
  actionError.value = '';
  try {
    await api.del(`/notes/${toDelete.value.id}`);
    notes.value = notes.value.filter((n) => n.id !== toDelete.value.id);
  } catch (err) {
    actionError.value = err.message;
  } finally {
    deleting.value = false;
    toDelete.value = null;
  }
}

/* ---------- gom theo ngày ---------- */
const today = todayKey();
const yesterday = addDays(today, -1);

function dayLabel(key) {
  if (key === today) return t('dates.today');
  if (key === yesterday) return t('dates.yesterday');
  return `${weekdayName(key)}, ${dayMonth(key)}`;
}

const groups = computed(() => {
  const out = [];
  for (const n of notes.value) {
    const key = toKey(new Date(n.createdAt));
    const last = out[out.length - 1];
    if (last && last.key === key) last.notes.push(n);
    else out.push({ key, notes: [n] });
  }
  return out;
});

const textareaClass =
  'w-full resize-y rounded-xl border bg-surface px-4 py-2.5 text-base outline-hidden transition-colors placeholder:text-muted md:text-sm';
const iconBtn =
  'inline-flex size-10 cursor-pointer items-center justify-center rounded-xl text-muted outline-hidden transition-colors hover:bg-foreground/5 hover:text-foreground';
</script>

<template>
  <div class="flex w-full max-w-3xl flex-col gap-4">
    <div class="min-w-0">
      <h1 class="text-xl font-semibold">{{ t('nav.noteline') }}</h1>
    </div>

    <!-- Ô soạn -->
    <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="h-compose">
      <h2 id="h-compose" class="sr-only">{{ t('notes.newNote') }}</h2>
      <form class="flex flex-col gap-3" novalidate @submit.prevent="post">
        <textarea
          ref="composeEl"
          v-model="draft"
          rows="3"
          :maxlength="MAX_LEN"
          :aria-label="t('notes.newNote')"
          :placeholder="t('notes.composePh')"
          :aria-invalid="composeError ? 'true' : undefined"
          aria-describedby="compose-note"
          :style="tint(draftColor)"
          :class="[
            textareaClass,
            composeError
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/10'
              : 'border-border-strong focus:border-focus focus:ring-2 focus:ring-focus',
          ]"
          @keydown="onComposeKeydown"
          @input="composeError = ''"
        />
        <NoteColorPicker v-model="draftColor" />
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p id="compose-note" class="text-xs" :class="composeError ? 'text-red-600' : 'text-muted'">
            <template v-if="composeError">{{ composeError }}</template>
            <template v-else>
              <span class="tabular-nums">{{ draft.length }}/{{ MAX_LEN }}</span>
            </template>
          </p>
          <BaseButton type="submit" variant="primary" size="form" :loading="posting" class="max-sm:w-full">
            {{ t('common.save') }}
          </BaseButton>
        </div>
      </form>
    </section>

    <!-- Tìm kiếm -->
    <div class="relative">
      <Search class="pointer-events-none absolute inset-y-0 left-4 my-auto size-4 text-muted" aria-hidden="true" />
      <input
        v-model="query"
        type="search"
        maxlength="100"
        :aria-label="t('notes.search')"
        :placeholder="t('notes.searchPh')"
        class="h-11 w-full rounded-xl border border-border-strong bg-surface pr-11 pl-10 text-base outline-hidden transition-colors placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus md:h-10 md:text-sm [&::-webkit-search-cancel-button]:hidden"
        @keydown.esc="clearSearch"
      />
      <button
        v-if="query"
        type="button"
        :aria-label="t('notes.clearSearch')"
        class="absolute inset-y-0 right-1 my-auto flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted outline-hidden hover:text-foreground"
        @click="clearSearch"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>

    <p v-if="actionError" role="alert" class="rounded-xl border border-sage/30 bg-sage/10 p-4 text-sm text-sage-fg">
      {{ actionError }}
    </p>

    <!-- Dòng thời gian -->
    <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="h-timeline" :aria-busy="loading || undefined">
      <h2 id="h-timeline" class="sr-only">{{ t('nav.noteline') }}</h2>

      <p v-if="error" role="alert" class="text-sm text-sage-fg">
        {{ error }}
        <button type="button" class="ml-1 cursor-pointer font-medium underline underline-offset-2" @click="load">{{ t('common.retry') }}</button>
      </p>
      <p v-else-if="loading" class="py-6 text-center text-sm text-muted">{{ t('common.loading') }}</p>
      <div v-else-if="!notes.length" class="flex flex-col items-center gap-3 py-8 text-center">
        <span class="flex size-10 items-center justify-center rounded-full bg-secondary">
          <NotebookPen class="size-5 text-muted" aria-hidden="true" />
        </span>
        <p class="max-w-sm text-sm text-pretty text-muted">
          {{ activeQuery ? t('notes.noResults', { q: activeQuery }) : t('notes.empty') }}
        </p>
      </div>

      <div v-else class="flex flex-col gap-6">
        <div v-for="g in groups" :key="g.key">
          <h3 class="mb-3 text-xs font-medium text-muted">{{ dayLabel(g.key) }}</h3>
          <ol>
            <li v-for="(n, i) in g.notes" :key="n.id" class="relative flex gap-3 pb-5 last:pb-0">
              <!-- Đường nối giữa hai vòng tròn -->
              <span
                v-if="i < g.notes.length - 1"
                class="absolute top-8 bottom-0 left-[15px] w-0.5 bg-border-strong"
                aria-hidden="true"
              />
              <span class="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted">
                <NotebookPen class="size-4" aria-hidden="true" />
              </span>

              <div class="min-w-0 flex-1">
                <div class="flex min-h-8 items-center justify-between gap-2">
                  <p class="text-xs text-muted tabular-nums">
                    <time :datetime="new Date(n.createdAt).toISOString()">{{ timeOfDay(n.createdAt) }}</time>
                    <span v-if="n.updatedAt"> · {{ t('notes.edited') }}</span>
                  </p>
                  <div v-if="editingId !== n.id" class="-my-1 flex shrink-0 items-center">
                    <button type="button" :class="iconBtn" :aria-label="t('notes.editNote')" @click="startEdit(n)">
                      <Pencil class="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" :class="[iconBtn, 'hover:text-sage-fg']" :aria-label="t('notes.deleteNote')" @click="toDelete = n">
                      <Trash2 class="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <!-- Sửa tại chỗ -->
                <form v-if="editingId === n.id" class="mt-1 flex flex-col gap-2" novalidate @submit.prevent="saveEdit(n)">
                  <textarea
                    ref="editEls"
                    v-model="editDraft"
                    rows="4"
                    :maxlength="MAX_LEN"
                    :aria-label="t('notes.editNote')"
                    :aria-invalid="editError ? 'true' : undefined"
                    :style="tint(editColor)"
                    :class="[
                      textareaClass,
                      editError
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/10'
                        : 'border-border-strong focus:border-focus focus:ring-2 focus:ring-focus',
                    ]"
                    @keydown="onEditKeydown($event, n)"
                  />
                  <NoteColorPicker v-model="editColor" />
                  <p v-if="editError" role="alert" class="text-xs text-red-600">{{ editError }}</p>
                  <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <BaseButton variant="secondary" size="form" @click="cancelEdit">{{ t('common.cancel') }}</BaseButton>
                    <BaseButton type="submit" variant="primary" size="form" :loading="saving">{{ t('common.save') }}</BaseButton>
                  </div>
                </form>
                <p
                  v-else
                  class="mt-1 text-sm/6 break-words whitespace-pre-wrap"
                  :class="n.color && 'rounded-xl px-3.5 py-2.5'"
                  :style="tint(n.color)"
                >{{ n.body }}</p>
              </div>
            </li>
          </ol>
        </div>

        <div v-if="hasMore" class="flex justify-center">
          <BaseButton variant="ghost" :loading="loadingMore" @click="loadMore">{{ t('notes.loadMore') }}</BaseButton>
        </div>
      </div>
    </section>

    <ConfirmDialog
      :open="Boolean(toDelete)"
      :title="t('notes.deleteTitle')"
      :message="t('notes.deleteMessage')"
      :confirm-label="t('notes.deleteNote')"
      :loading="deleting"
      @cancel="toDelete = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

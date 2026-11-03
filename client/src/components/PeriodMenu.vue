<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';
import { t } from '../i18n';
import { fullDate } from '../lib/dates';

// modelValue: { preset: '7'|'30'|'90'|'180'|'365'|'all'|'custom', from, to }
const props = defineProps({ modelValue: { type: Object, required: true }, today: { type: String, required: true } });
const emit = defineEmits(['update:modelValue']);

const PRESETS = ['7', '30', '90', '180', '365', 'all'];

const open = ref(false);
const custom = ref(false); // đang mở phần nhập ngày
const from = ref('');
const to = ref('');
const error = ref('');
const root = ref(null);
const trigger = ref(null);

const label = computed(() => {
  const v = props.modelValue;
  if (v.preset === 'custom') return `${fullDate(v.from)} – ${fullDate(v.to)}`;
  return t(`stats.range.${v.preset}`);
});

function toggle() {
  open.value = !open.value;
  if (open.value) {
    custom.value = props.modelValue.preset === 'custom';
    from.value = props.modelValue.from || '';
    to.value = props.modelValue.to || props.today;
    error.value = '';
  }
}

function close(refocus = false) {
  open.value = false;
  if (refocus) nextTick(() => trigger.value?.focus());
}

function pick(preset) {
  emit('update:modelValue', { preset });
  close(true);
}

function applyCustom() {
  if (!from.value || !to.value || from.value > to.value) {
    error.value = t('stats.errRange');
    return;
  }
  emit('update:modelValue', { preset: 'custom', from: from.value, to: to.value > props.today ? props.today : to.value });
  close(true);
}

function onDocClick(e) {
  if (open.value && root.value && !root.value.contains(e.target)) close();
}
function onKeydown(e) {
  if (e.key === 'Escape' && open.value) {
    e.stopPropagation();
    close(true);
  }
}

watch(from, () => (error.value = ''));
watch(to, () => (error.value = ''));
onMounted(() => document.addEventListener('mousedown', onDocClick));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick));

const item =
  'flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-left text-sm outline-hidden transition-colors hover:bg-item-hover focus-visible:bg-item-hover';
</script>

<template>
  <div ref="root" class="relative" @keydown="onKeydown">
    <button
      ref="trigger"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="t('stats.period')"
      class="inline-flex h-10 max-w-full cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface px-3.5 text-sm font-medium outline-hidden transition-colors hover:bg-button-hover focus-visible:ring-2 focus-visible:ring-focus"
      @click="toggle"
    >
      <span class="truncate">{{ label }}</span>
      <ChevronDown class="size-4 shrink-0 text-muted transition-transform" :class="open && 'rotate-180'" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      role="menu"
      class="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface-overlay p-1.5 shadow-popover"
    >
      <button
        v-for="p in PRESETS"
        :key="p"
        type="button"
        role="menuitemradio"
        :aria-checked="modelValue.preset === p"
        :class="item"
        @click="pick(p)"
      >
        {{ t(`stats.range.${p}`) }}
        <Check v-if="modelValue.preset === p" class="size-4 text-muted" aria-hidden="true" />
      </button>

      <button
        type="button"
        role="menuitemradio"
        :aria-checked="modelValue.preset === 'custom'"
        :aria-expanded="custom"
        :class="item"
        @click="custom = !custom"
      >
        {{ t('stats.range.custom') }}
        <Check v-if="modelValue.preset === 'custom'" class="size-4 text-muted" aria-hidden="true" />
      </button>

      <form v-if="custom" class="flex flex-col gap-3 border-t border-border px-3 pt-3 pb-2" novalidate @submit.prevent="applyCustom">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          {{ t('stats.from') }}
          <input
            v-model="from"
            type="date"
            :max="today"
            class="h-11 rounded-xl border border-border-strong bg-surface px-3 text-base font-normal text-foreground outline-hidden focus:border-focus focus:ring-2 focus:ring-focus md:h-10 md:text-sm"
          />
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          {{ t('stats.to') }}
          <input
            v-model="to"
            type="date"
            :max="today"
            class="h-11 rounded-xl border border-border-strong bg-surface px-3 text-base font-normal text-foreground outline-hidden focus:border-focus focus:ring-2 focus:ring-focus md:h-10 md:text-sm"
          />
        </label>
        <p v-if="error" role="alert" class="text-xs text-red-600">{{ error }}</p>
        <button
          type="submit"
          class="min-h-11 cursor-pointer rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground outline-hidden transition-colors hover:bg-primary-hover md:min-h-10"
        >
          {{ t('stats.apply') }}
        </button>
      </form>
    </div>
  </div>
</template>

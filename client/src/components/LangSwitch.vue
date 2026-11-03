<script setup>
import { locale, setLocale, t } from '../i18n';

const options = [
  { v: 'vi', label: 'VI', name: 'Tiếng Việt' },
  { v: 'en', label: 'EN', name: 'English' },
];
</script>

<template>
  <!-- Nút phân đoạn nhỏ, cùng kiểu với bộ chọn kỳ ở Thống kê -->
  <div
    role="group"
    :aria-label="t('common.language')"
    class="inline-flex w-fit shrink-0 gap-1 rounded-xl bg-background p-1 shadow-(--shadow-segment-track)"
  >
    <button
      v-for="o in options"
      :key="o.v"
      type="button"
      :lang="o.v"
      :title="o.name"
      :aria-label="o.name"
      :aria-pressed="locale === o.v"
      class="h-7 cursor-pointer rounded-lg px-2.5 text-xs font-medium outline-hidden transition-[color,background-color,box-shadow] duration-150"
      :class="locale === o.v ? 'bg-surface text-foreground shadow-(--shadow-segment-thumb)' : 'text-foreground/60 hover:text-foreground'"
      @click="setLocale(o.v)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

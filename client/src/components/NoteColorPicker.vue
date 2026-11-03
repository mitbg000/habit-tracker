<script setup>
import { Ban } from 'lucide-vue-next';
import { PALETTE, COLOR_KEYS } from '../lib/habitStyle';
import { t } from '../i18n';

// modelValue: khoá màu hoặc null (không màu)
defineProps({ modelValue: String });
const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <div role="group" :aria-label="t('notes.color')" class="flex flex-wrap items-center gap-1.5">
    <button
      type="button"
      :aria-label="t('notes.noColor')"
      :title="t('notes.noColor')"
      :aria-pressed="!modelValue"
      class="flex size-7 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface text-muted outline-hidden transition-shadow focus-visible:ring-2 focus-visible:ring-focus"
      :class="!modelValue && 'ring-2 ring-foreground/60 ring-offset-2 ring-offset-surface'"
      @click="emit('update:modelValue', null)"
    >
      <Ban class="size-3.5" aria-hidden="true" />
    </button>
    <button
      v-for="k in COLOR_KEYS"
      :key="k"
      type="button"
      :aria-label="t(`habits.colors.${k}`)"
      :title="t(`habits.colors.${k}`)"
      :aria-pressed="modelValue === k"
      class="size-7 cursor-pointer rounded-full border border-black/5 outline-hidden transition-shadow focus-visible:ring-2 focus-visible:ring-focus"
      :class="modelValue === k && 'ring-2 ring-foreground/60 ring-offset-2 ring-offset-surface'"
      :style="{ backgroundColor: PALETTE[k].bg }"
      @click="emit('update:modelValue', modelValue === k ? null : k)"
    />
  </div>
</template>

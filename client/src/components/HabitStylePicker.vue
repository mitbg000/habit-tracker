<script setup>
import { PALETTE, COLOR_KEYS, ICONS, ICON_KEYS } from '../lib/habitStyle';
import { t } from '../i18n';

// Giá trị null nghĩa là để mặc định (màu theo thói quen, icon theo loại)
defineProps({ color: String, icon: String });
const emit = defineEmits(['update:color', 'update:icon']);
</script>

<template>
  <div class="flex flex-col gap-4">
    <fieldset>
      <legend class="mb-2 text-sm font-medium">{{ t('habits.color') }}</legend>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="k in COLOR_KEYS"
          :key="k"
          type="button"
          :aria-label="t(`habits.colors.${k}`)"
          :aria-pressed="color === k"
          class="flex size-9 cursor-pointer items-center justify-center rounded-full outline-hidden ring-offset-2 ring-offset-surface transition-shadow focus-visible:ring-2 focus-visible:ring-focus"
          :class="color === k && 'ring-2 ring-foreground/60'"
          :style="{ backgroundColor: PALETTE[k].bg }"
          @click="emit('update:color', color === k ? null : k)"
        >
          <span class="size-4 rounded-full" :style="{ backgroundColor: PALETTE[k].fg }" />
        </button>
      </div>
    </fieldset>

    <fieldset>
      <legend class="mb-2 text-sm font-medium">{{ t('habits.icon') }}</legend>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="k in ICON_KEYS"
          :key="k"
          type="button"
          :aria-label="t(`habits.icons.${k}`)"
          :title="t(`habits.icons.${k}`)"
          :aria-pressed="icon === k"
          class="flex size-9 cursor-pointer items-center justify-center rounded-lg border outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-focus"
          :class="icon === k ? 'border-transparent bg-primary text-primary-foreground' : 'border-border-strong bg-surface text-muted hover:bg-button-hover hover:text-foreground'"
          @click="emit('update:icon', icon === k ? null : k)"
        >
          <component :is="ICONS[k]" class="size-4" aria-hidden="true" />
        </button>
      </div>
    </fieldset>
  </div>
</template>

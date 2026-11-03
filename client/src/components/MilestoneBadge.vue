<script setup>
import { computed } from 'vue';
import { Flame, Medal, Award, Trophy } from 'lucide-vue-next';
import { t } from '../i18n';

const props = defineProps({
  m: { type: Number, required: true },
  earned: Boolean,
  compact: Boolean, // dạng viên nhỏ nằm cạnh tên thói quen
  fg: String,
  bg: String,
});

// Mốc càng lớn, biểu tượng càng "nặng"
const icon = computed(() => (props.m >= 365 ? Trophy : props.m >= 90 ? Award : props.m >= 30 ? Medal : Flame));
</script>

<template>
  <span
    v-if="compact"
    class="inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium"
    :style="{ backgroundColor: bg, color: fg }"
    :title="t(`milestones.${m}`)"
  >
    <component :is="icon" class="size-3.5" aria-hidden="true" />
    {{ t(`milestones.${m}`) }}
  </span>
  <span
    v-else
    class="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
    :class="!earned && 'opacity-45'"
    :title="t(`milestones.${m}`)"
  >
    <span
      class="flex size-11 items-center justify-center rounded-full"
      :class="!earned && 'border border-dashed border-border-strong'"
      :style="earned ? { backgroundColor: bg, color: fg } : undefined"
    >
      <component :is="icon" class="size-5" aria-hidden="true" :class="!earned && 'text-muted'" />
    </span>
    <span class="text-xs leading-tight" :class="earned ? 'font-medium text-foreground' : 'text-muted'">{{ t(`milestones.${m}`) }}</span>
    <span class="sr-only">{{ earned ? '✓' : '' }}</span>
  </span>
</template>

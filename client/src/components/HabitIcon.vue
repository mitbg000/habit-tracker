<script setup>
import { computed } from 'vue';
import { habitStyle } from '../lib/habitStyle';

const props = defineProps({ habit: { type: Object, required: true } });
const style = computed(() => habitStyle(props.habit));
</script>

<template>
  <span
    class="flex size-8 shrink-0 items-center justify-center rounded-lg"
    :style="{ backgroundColor: style.bg, color: style.fg }"
    aria-hidden="true"
  >
    <component :is="style.icon" class="size-4" />
  </span>
</template>

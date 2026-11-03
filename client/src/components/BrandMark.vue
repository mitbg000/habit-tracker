<script setup>
defineProps({ name: { type: String, default: 'Nhịp' }, large: Boolean });
</script>

<template>
  <span class="flex min-w-0 items-center gap-2.5">
    <span
      class="flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      :class="large ? 'size-10' : 'size-8'"
    >
      <!-- Dấu "nhịp": ba thanh nhịp tăng dần, thanh cuối là điểm nhấn -->
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" :class="large ? 'size-6' : 'size-5'">
        <rect x="4" y="12" width="3.5" height="8" rx="1.75" />
        <rect x="10.25" y="7" width="3.5" height="13" rx="1.75" />
        <rect x="16.5" y="4" width="3.5" height="16" rx="1.75" />
      </svg>
    </span>
    <span class="truncate font-semibold text-foreground" :class="large ? 'text-base' : 'text-sm'">{{ name }}</span>
  </span>
</template>

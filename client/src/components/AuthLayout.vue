<script setup>
import BrandMark from './BrandMark.vue';
import LangSwitch from './LangSwitch.vue';
defineProps({ title: { type: String, required: true }, lead: String });
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
    <div class="w-full max-w-md">
      <!-- Card đứng một mình, không viền (M29) -->
      <div class="rounded-2xl bg-surface p-6 sm:p-8">
        <div class="flex items-center justify-between gap-3">
          <BrandMark large />
          <LangSwitch />
        </div>
        <h1 class="mt-8 text-xl font-semibold">{{ title }}</h1>
        <p v-if="lead" class="mt-2 text-sm text-muted">{{ lead }}</p>
        <div class="mt-6">
          <slot />
        </div>
      </div>
      <p class="mt-6 text-center text-sm text-muted">
        <slot name="footer" />
      </p>
    </div>
  </div>
</template>

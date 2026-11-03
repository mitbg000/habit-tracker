<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { auth } from './store';
import AppShell from './components/AppShell.vue';

const route = useRoute();
const isPublic = computed(() => Boolean(route.meta.public));
</script>

<template>
  <template v-if="auth.ready">
    <RouterView v-if="isPublic || !auth.user" />
    <AppShell v-else>
      <RouterView />
    </AppShell>
  </template>
</template>

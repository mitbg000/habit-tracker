<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { auth } from './store';
import AppShell from './components/AppShell.vue';
import { todayKey } from './lib/dates';

const route = useRoute();
const isPublic = computed(() => Boolean(route.meta.public));

// Các trang được giữ trong bộ nhớ theo ngày: sang ngày mới thì tạo lại để "hôm nay" không bị cũ
const dayKey = ref(todayKey());
const syncDay = () => (dayKey.value = todayKey());
watch(() => route.fullPath, syncDay);
onMounted(() => document.addEventListener('visibilitychange', syncDay));
onBeforeUnmount(() => document.removeEventListener('visibilitychange', syncDay));
</script>

<template>
  <template v-if="auth.ready">
    <RouterView v-if="isPublic || !auth.user" />
    <AppShell v-else>
      <RouterView v-slot="{ Component, route: current }">
        <KeepAlive :max="5">
          <component :is="Component" v-if="Component" :key="`${String(current.name)}|${dayKey}`" />
        </KeepAlive>
      </RouterView>
    </AppShell>
  </template>
</template>

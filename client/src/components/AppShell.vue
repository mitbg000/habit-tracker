<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { CalendarCheck, ChartColumn, ListChecks, NotebookPen, Settings, LogOut } from 'lucide-vue-next';
import BrandMark from './BrandMark.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import LangSwitch from './LangSwitch.vue';
import { auth, logout } from '../store';
import { t } from '../i18n';

const router = useRouter();

const nav = [
  { to: '/', label: 'nav.today', icon: CalendarCheck, exact: true },
  { to: '/thong-ke', label: 'nav.stats', icon: ChartColumn },
  { to: '/thoi-quen', label: 'nav.habits', icon: ListChecks },
  { to: '/noteline', label: 'nav.noteline', icon: NotebookPen },
  { to: '/cai-dat', label: 'nav.settings', icon: Settings },
];

const confirmOpen = ref(false);
const loggingOut = ref(false);

async function doLogout() {
  loggingOut.value = true;
  try {
    await logout();
  } finally {
    loggingOut.value = false;
    confirmOpen.value = false;
    router.replace({ name: 'login' });
  }
}
</script>

<template>
  <div class="min-h-dvh lg:flex">
    <!-- Sidebar (từ lg): nền trắng cạnh nền xám đã là ranh giới, không kẻ dọc -->
    <aside class="hidden w-60 shrink-0 flex-col bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh">
      <div class="flex h-14 items-center border-b border-border px-5">
        <BrandMark />
      </div>
      <nav class="flex flex-1 flex-col gap-1 px-3 py-3" :aria-label="t('nav.main')">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          custom
          v-slot="{ href, navigate, isActive, isExactActive }"
        >
          <a
            :href="href"
            :aria-current="(item.exact ? isExactActive : isActive) ? 'page' : undefined"
            class="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm outline-hidden transition-colors"
            :class="
              (item.exact ? isExactActive : isActive)
                ? 'bg-secondary font-medium text-foreground'
                : 'text-foreground/70 hover:bg-item-hover hover:text-foreground'
            "
            @click="navigate"
          >
            <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
            {{ t(item.label) }}
          </a>
        </RouterLink>
      </nav>
      <div class="border-t border-border p-3">
        <div class="px-3 pb-3">
          <LangSwitch />
        </div>
        <p class="truncate px-3 pb-2 text-xs text-muted" :title="auth.user?.username">
          {{ t('nav.signedInAs') }} <span class="font-medium text-foreground">{{ auth.user?.username }}</span>
        </p>
        <button
          type="button"
          class="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm text-foreground/70 outline-hidden transition-colors hover:bg-sage/15 hover:text-sage-fg"
          @click="confirmOpen = true"
        >
          <LogOut class="size-4 shrink-0" aria-hidden="true" />
          {{ t('nav.logout') }}
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Thanh trên ở màn hẹp -->
      <header class="flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 lg:hidden">
        <BrandMark />
        <LangSwitch />
      </header>

      <!-- Trang nằm giữa phần còn lại bên cạnh sidebar -->
      <main class="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:pb-6 [&>*]:mx-auto">
        <slot />
      </main>
    </div>

    <!-- Thanh điều hướng dưới (màn hẹp, 5 mục) -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      :aria-label="t('nav.main')"
    >
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ href, navigate, isActive, isExactActive }"
      >
        <a
          :href="href"
          :aria-current="(item.exact ? isExactActive : isActive) ? 'page' : undefined"
          class="flex h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 px-0.5 text-center text-xs leading-tight outline-hidden"
          :class="(item.exact ? isExactActive : isActive) ? 'font-medium text-foreground' : 'text-muted'"
          @click="navigate"
        >
          <component :is="item.icon" class="size-5" aria-hidden="true" />
          {{ t(item.label) }}
        </a>
      </RouterLink>
    </nav>

    <ConfirmDialog
      :open="confirmOpen"
      icon="logout"
      :title="t('nav.logoutTitle')"
      :message="t('nav.logoutMessage')"
      :confirm-label="t('nav.logout')"
      :loading="loggingOut"
      @cancel="confirmOpen = false"
      @confirm="doLogout"
    />
  </div>
</template>

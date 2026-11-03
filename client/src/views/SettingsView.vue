<script setup>
import { ref } from 'vue';
import { Download } from 'lucide-vue-next';
import BaseField from '../components/BaseField.vue';
import BaseButton from '../components/BaseButton.vue';
import { api } from '../api';
import { auth } from '../store';
import { locale, t } from '../i18n';
import LangSwitch from '../components/LangSwitch.vue';

/* ---------- đổi mật khẩu ---------- */
const current = ref('');
const next = ref('');
const errors = ref({ current: '', next: '' });
const saving = ref(false);
const formError = ref('');
const done = ref(false);

async function changePassword() {
  if (saving.value) return;
  done.value = false;
  formError.value = '';
  errors.value = {
    current: current.value ? '' : t('settings.errCurrent'),
    next: !next.value ? t('settings.errNew') : next.value.length < 8 ? t('auth.errPasswordShort') : '',
  };
  if (errors.value.current || errors.value.next) return;

  saving.value = true;
  try {
    await api.post('/auth/change-password', { current: current.value, next: next.value });
    current.value = '';
    next.value = '';
    done.value = true;
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}

/* ---------- xuất dữ liệu ---------- */
const exporting = ref(false);
const exportError = ref('');

async function exportData() {
  exporting.value = true;
  exportError.value = '';
  try {
    const res = await fetch('/api/export', { credentials: 'same-origin', headers: { 'X-Requested-With': 'habit-tracker', 'X-Lang': locale.value } });
    if (!res.ok) throw new Error(t('settings.exportError'));
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhip-du-lieu.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    exportError.value = err.message;
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div class="flex w-full max-w-3xl flex-col gap-4">
    <div class="min-w-0">
      <h1 class="text-xl font-semibold">{{ t('nav.settings') }}</h1>
    </div>

    <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="h-pw">
      <h2 id="h-pw" class="mb-4 text-base font-semibold">{{ t('settings.changePw') }}</h2>
      <form class="flex max-w-md flex-col gap-2" novalidate @submit.prevent="changePassword">
        <!-- Trình quản lý mật khẩu cần biết đang đổi cho tài khoản nào -->
        <input type="text" :value="auth.user?.username" autocomplete="username" class="hidden" readonly tabindex="-1" aria-hidden="true" />
        <BaseField
          v-model="current"
          type="password"
          :label="t('settings.currentPw')"
          :placeholder="t('settings.currentPwPh')"
          autocomplete="current-password"
          :error="errors.current"
        />
        <BaseField
          v-model="next"
          type="password"
          :label="t('settings.newPw')"
          :placeholder="t('settings.newPwPh')"
          :hint="t('auth.passwordHint')"
          autocomplete="new-password"
          :error="errors.next"
        />
        <p v-if="formError" role="alert" class="text-sm text-red-600">{{ formError }}</p>
        <p v-if="done" role="status" class="text-sm text-muted">{{ t('settings.pwChanged') }}</p>
        <div class="flex sm:justify-start">
          <BaseButton type="submit" variant="primary" size="form" :loading="saving" class="max-sm:w-full">{{ t('settings.savePw') }}</BaseButton>
        </div>
      </form>
    </section>

    <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="h-lang">
      <h2 id="h-lang" class="text-base font-semibold">{{ t('common.language') }}</h2>
      <div class="mb-4" />
      <LangSwitch />
    </section>

    <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="h-data">
      <h2 id="h-data" class="text-base font-semibold">{{ t('settings.data') }}</h2>
      <div class="mb-4" />
      <BaseButton size="form" :loading="exporting" class="max-sm:w-full" @click="exportData">
        <template #icon><Download class="size-4 shrink-0" aria-hidden="true" /></template>
        {{ t('settings.download') }}
      </BaseButton>
      <p v-if="exportError" role="alert" class="mt-3 text-sm text-red-600">{{ exportError }}</p>
    </section>
  </div>
</template>

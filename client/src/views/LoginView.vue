<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthLayout from '../components/AuthLayout.vue';
import BaseField from '../components/BaseField.vue';
import BaseButton from '../components/BaseButton.vue';
import { api } from '../api';
import { auth, setUser } from '../store';
import { t } from '../i18n';

const router = useRouter();

const username = ref('');
const password = ref('');
const website = ref(''); // ô bẫy bot: người thật không thấy, không điền
const startedAt = Date.now();

const passwordField = ref(null);
const loading = ref(false);
const formError = ref('');
const errors = ref({ username: '', password: '' });

async function submit() {
  if (loading.value) return;
  errors.value = { username: '', password: '' };
  formError.value = '';

  if (!username.value.trim()) errors.value.username = t('auth.errUsername');
  if (!password.value) errors.value.password = t('auth.errPassword');
  if (errors.value.username || errors.value.password) return;

  loading.value = true;
  try {
    const { user } = await api.post('/auth/login', {
      username: username.value,
      password: password.value,
      website: website.value,
      formStartedAt: startedAt,
    });
    setUser(user);
    router.replace({ name: 'today' });
  } catch (err) {
    formError.value = err.message;
    // Giữ tên đăng nhập, xoá mật khẩu và đưa con trỏ vào đó
    password.value = '';
    passwordField.value?.focus();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout :title="t('auth.login')">
    <form class="flex flex-col" novalidate @submit.prevent="submit">
      <div class="flex flex-col gap-2">
        <BaseField
          v-model="username"
          :label="t('auth.username')"
          :placeholder="t('auth.usernamePh')"
          autocomplete="username"
          :error="errors.username"
          tall
          autofocus
        />
        <BaseField
          ref="passwordField"
          v-model="password"
          type="password"
          :label="t('auth.password')"
          :placeholder="t('auth.passwordPh')"
          autocomplete="current-password"
          :error="errors.password"
          tall
        />
      </div>

      <!-- Bẫy bot -->
      <div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>Website <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
      </div>

      <p v-if="formError" role="alert" class="mt-1 text-sm text-red-600">{{ formError }}</p>

      <BaseButton type="submit" variant="primary" size="tall" block :loading="loading" class="mt-5">
        {{ t('auth.login') }}
      </BaseButton>
    </form>

    <template #footer>
      <template v-if="auth.allowRegister">
        {{ t('auth.noAccount') }}
        <RouterLink to="/dang-ky" class="font-medium text-foreground underline-offset-2 hover:underline">{{ t('auth.register') }}</RouterLink>
      </template>
      <template v-else>{{ t('auth.registerClosed') }}</template>
    </template>
  </AuthLayout>
</template>

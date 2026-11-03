<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { RefreshCw } from 'lucide-vue-next';
import AuthLayout from '../components/AuthLayout.vue';
import BaseField from '../components/BaseField.vue';
import BaseButton from '../components/BaseButton.vue';
import { api } from '../api';
import { auth, setUser } from '../store';
import { locale, t } from '../i18n';

const router = useRouter();

const username = ref('');
const password = ref('');
const captcha = ref('');
const website = ref('');
const startedAt = Date.now();

const captchaId = ref('');
const captchaSvg = ref('');
const captchaLoading = ref(false);

const loading = ref(false);
const formError = ref('');
const errors = ref({ username: '', password: '', captcha: '' });

async function loadCaptcha() {
  captchaLoading.value = true;
  try {
    const data = await api.get('/auth/captcha');
    captchaId.value = data.id;
    captchaSvg.value = data.svg;
    captcha.value = '';
  } catch (err) {
    formError.value = err.message;
  } finally {
    captchaLoading.value = false;
  }
}

onMounted(() => {
  if (auth.allowRegister) loadCaptcha();
});

function validate() {
  const e = { username: '', password: '', captcha: '' };
  const name = username.value.trim().toLowerCase();
  if (!name) e.username = t('auth.errUsername');
  else if (!/^[a-z0-9_.]{3,32}$/.test(name)) e.username = t('auth.errUsernameFormat');
  if (!password.value) e.password = t('auth.errPassword');
  else if (password.value.length < 8) e.password = t('auth.errPasswordShort');
  if (!captcha.value.trim()) e.captcha = t('auth.errCaptcha');
  errors.value = e;
  return !e.username && !e.password && !e.captcha;
}

async function submit() {
  if (loading.value) return;
  formError.value = '';
  if (!validate()) return;

  loading.value = true;
  try {
    const { user } = await api.post('/auth/register', {
      username: username.value,
      password: password.value,
      captchaId: captchaId.value,
      captcha: captcha.value,
      website: website.value,
      formStartedAt: startedAt,
      lang: locale.value, // thói quen mặc định tạo theo ngôn ngữ đang chọn
    });
    setUser(user);
    router.replace({ name: 'today' });
  } catch (err) {
    if (err.field && err.field in errors.value) errors.value[err.field] = err.message;
    else formError.value = err.message;
    // Mã xác nhận chỉ dùng được một lần
    await loadCaptcha();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout :title="t('auth.register')">
    <p v-if="!auth.allowRegister" class="text-sm text-muted">{{ t('auth.registerClosedLong') }}</p>

    <form v-else class="flex flex-col" novalidate @submit.prevent="submit">
      <div class="flex flex-col gap-2">
        <BaseField
          v-model="username"
          :label="t('auth.username')"
          :placeholder="t('auth.newUsernamePh')"
          :hint="t('auth.usernameHint')"
          autocomplete="username"
          :error="errors.username"
          tall
          autofocus
        />
        <BaseField
          v-model="password"
          type="password"
          :label="t('auth.password')"
          :placeholder="t('auth.newPasswordPh')"
          :hint="t('auth.passwordHint')"
          autocomplete="new-password"
          :error="errors.password"
          tall
        />

        <!-- Mã xác nhận chống đăng ký hàng loạt -->
        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium">{{ t('auth.captcha') }}</span>
          <div class="flex items-center gap-2">
            <div
              class="flex h-12 w-[140px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-strong bg-[#f4f1ea]"
              :class="captchaLoading && 'opacity-50'"
              role="img"
              :aria-label="t('auth.captchaImg')"
              v-html="captchaSvg"
            />
            <button
              type="button"
              class="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border-strong bg-surface text-muted outline-hidden transition-colors hover:bg-button-hover hover:text-foreground"
              :aria-label="t('auth.captchaRefresh')"
              @click="loadCaptcha"
            >
              <RefreshCw class="size-4" :class="captchaLoading && 'animate-spin'" aria-hidden="true" />
            </button>
          </div>
        </div>
        <BaseField
          v-model="captcha"
          :label="t('auth.captchaInput')"
          :placeholder="t('auth.captchaInput')"
          autocomplete="off"
          :error="errors.captcha"
          tall
          @enter="submit"
        />
      </div>

      <div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>Website <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
      </div>

      <p v-if="formError" role="alert" class="mt-1 text-sm text-red-600">{{ formError }}</p>

      <BaseButton type="submit" variant="primary" size="tall" block :loading="loading" class="mt-5">
        {{ t('auth.register') }}
      </BaseButton>
    </form>

    <template #footer>
      {{ t('auth.hasAccount') }}
      <RouterLink to="/dang-nhap" class="font-medium text-foreground underline-offset-2 hover:underline">{{ t('auth.login') }}</RouterLink>
    </template>
  </AuthLayout>
</template>

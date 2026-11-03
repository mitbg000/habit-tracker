import { ref } from 'vue';
import { locale, t } from './i18n';

// Tăng sau mỗi lần ghi thành công, để các trang đang giữ trong bộ nhớ biết cần làm mới
export const dataVersion = ref(0);

let onUnauthorized = () => {};

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(method, url, body) {
  let res;
  try {
    res = await fetch(`/api${url}`, {
      method,
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'habit-tracker',
        'X-Lang': locale.value,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error(t('common.networkError'));
    err.status = 0;
    throw err;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/auth/')) onUnauthorized();
    const err = new Error(data?.error || t('common.genericError'));
    err.status = res.status;
    err.field = data?.field;
    throw err;
  }
  if (method !== 'GET') dataVersion.value += 1;
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
  put: (url, body = {}) => request('PUT', url, body),
  patch: (url, body = {}) => request('PATCH', url, body),
  // Máy chủ chỉ nhận DELETE kèm Content-Type JSON (chặn CSRF), nên gửi body rỗng
  del: (url) => request('DELETE', url, {}),
};

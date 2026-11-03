import { reactive } from 'vue';
import { api } from './api';

export const auth = reactive({
  user: null,
  ready: false,
  allowRegister: true,
});

export async function loadSession() {
  try {
    const [{ allowRegister }, me] = await Promise.all([
      api.get('/auth/config'),
      api.get('/auth/me').catch(() => null),
    ]);
    auth.allowRegister = allowRegister;
    auth.user = me?.user || null;
  } catch {
    auth.user = null;
  } finally {
    auth.ready = true;
  }
}

export function setUser(user) {
  auth.user = user;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    auth.user = null;
  }
}

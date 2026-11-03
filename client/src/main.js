import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { setUnauthorizedHandler } from './api';
import { auth } from './store';
import './style.css';

setUnauthorizedHandler(() => {
  auth.user = null;
  if (router.currentRoute.value.name !== 'login') router.replace({ name: 'login' });
});

createApp(App).use(router).mount('#app');

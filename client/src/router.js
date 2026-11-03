import { watch } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { auth, loadSession } from './store';
import { locale, t } from './i18n';

const routes = [
  { path: '/dang-nhap', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true, title: 'auth.login' } },
  { path: '/dang-ky', name: 'register', component: () => import('./views/RegisterView.vue'), meta: { public: true, title: 'auth.signup' } },
  { path: '/', name: 'today', component: () => import('./views/TodayView.vue'), meta: { title: 'nav.today' } },
  { path: '/thong-ke', name: 'stats', component: () => import('./views/StatsView.vue'), meta: { title: 'nav.stats' } },
  { path: '/thoi-quen', name: 'habits', component: () => import('./views/HabitsView.vue'), meta: { title: 'nav.habits' } },
  { path: '/noteline', name: 'noteline', component: () => import('./views/NotelineView.vue'), meta: { title: 'nav.noteline' } },
  { path: '/cai-dat', name: 'settings', component: () => import('./views/SettingsView.vue'), meta: { title: 'nav.settings' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  if (!auth.ready) await loadSession();
  if (!to.meta.public && !auth.user) return { name: 'login' };
  if (to.meta.public && auth.user) return { name: 'today' };
});

// meta.title là key dịch, để đổi ngôn ngữ thì tiêu đề tab cũng đổi theo
function setTitle(route) {
  document.title = route.meta.title ? `${t(route.meta.title)} · Nhịp` : 'Nhịp';
}
router.afterEach(setTitle);
watch(locale, () => setTitle(router.currentRoute.value));

export default router;

import { createRouter, createWebHistory } from 'vue-router';
import LoginView from './views/LoginView.vue';
import ChatView from './views/ChatView.vue';
import ProfileView from './views/ProfileView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/chat' },
    { path: '/login', component: LoginView },
    { path: '/chat', component: ChatView },
    { path: '/profil', component: ProfileView },
    { path: '/profile', redirect: '/profil' },
  ],
});


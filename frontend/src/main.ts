import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { router } from './router';
import { initApp } from './store';

// Initialiser l'app et restaurer la session si un token existe
initApp().then((isAuthenticated) => {
  if (!isAuthenticated && router.currentRoute.value.path !== '/login') {
    router.push('/login');
  }
});

createApp(App).use(router).mount('#app');

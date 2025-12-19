<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login, register } from '../store';

const router = useRouter();
const email = ref('');
const password = ref('');
const username = ref('');
const mode = ref<'login' | 'register'>('login');
const error = ref('');

async function submit() {
  error.value = '';
  try {
    if (mode.value === 'login') {
      await login(email.value, password.value);
    } else {
      await register(email.value, password.value, username.value);
    }
    router.push('/chat');
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Erreur';
  }
}
</script>

<template>
  <div class="auth">
    <h1>{{ mode === 'login' ? 'Connexion' : 'Inscription' }}</h1>
    <form @submit.prevent="submit">
      <input v-model="email" placeholder="Email" type="email" required />
      <input v-model="password" placeholder="Mot de passe" type="password" required />
      <input v-if="mode === 'register'" v-model="username" placeholder="Username" required />
      <button type="submit">{{ mode === 'login' ? 'Se connecter' : "S'inscrire" }}</button>
    </form>
    <p v-if="error" class="err">{{ error }}</p>
    <button class="ghost" @click="mode = mode === 'login' ? 'register' : 'login'">
      {{ mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà inscrit ? Se connecter' }}
    </button>
  </div>
</template>

<style scoped>
.auth {
  max-width: 360px;
  margin: 40px auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}
form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
input,
button {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 14px;
}
button {
  background: #2563eb;
  color: #fff;
  border: none;
}
.ghost {
  background: transparent;
  color: #2563eb;
  border: 1px solid #2563eb;
}
.err {
  color: #e11d48;
}
</style>


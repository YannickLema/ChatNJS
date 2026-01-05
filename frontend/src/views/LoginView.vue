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
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <h1>{{ mode === 'login' ? 'Connexion' : 'Inscription' }}</h1>
        <p class="auth-subtitle">
          {{ mode === 'login' ? 'Bienvenue de retour !' : 'Rejoignez notre communauté' }}
        </p>
      </div>
      
      <form @submit.prevent="submit" class="auth-form">
        <div class="input-group">
          <input 
            v-model="email" 
            placeholder="Email" 
            type="email" 
            required 
            class="auth-input"
          />
        </div>
        
        <div class="input-group">
          <input 
            v-model="password" 
            placeholder="Mot de passe" 
            type="password" 
            required 
            class="auth-input"
          />
        </div>
        
        <div v-if="mode === 'register'" class="input-group">
          <input 
            v-model="username" 
            placeholder="Nom d'utilisateur" 
            required 
            class="auth-input"
          />
        </div>
        
        <button type="submit" class="btn-primary">
          {{ mode === 'login' ? 'Se connecter' : "S'inscrire" }}
        </button>
      </form>
      
      <p v-if="error" class="error-message">{{ error }}</p>
      
      <div class="auth-footer">
        <button class="btn-ghost" @click="mode = mode === 'login' ? 'register' : 'login'">
          {{ mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà inscrit ? Se connecter' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background: linear-gradient(135deg, var(--autumn-cream) 0%, var(--autumn-beige) 50%, var(--autumn-tan) 100%);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--autumn-white);
  padding: var(--spacing-xl);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(217, 119, 6, 0.1);
}

.auth-header {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.auth-header h1 {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--autumn-brown);
  margin-bottom: var(--spacing-sm);
}

.auth-subtitle {
  color: var(--autumn-gray);
  font-size: 0.95rem;
  font-weight: 400;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.input-group {
  display: flex;
  flex-direction: column;
}

.auth-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--autumn-border);
  border-radius: var(--radius-md);
  font-size: 15px;
  font-family: var(--font-body);
  background: var(--autumn-white);
  color: var(--autumn-gray-dark);
  transition: all 0.3s ease;
}

.auth-input::placeholder {
  color: var(--autumn-gray);
}

.auth-input:focus {
  border-color: var(--autumn-orange);
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.1);
  background: var(--autumn-cream);
}

.btn-primary {
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  border-radius: var(--radius-full);
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
  margin-top: var(--spacing-sm);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  background: linear-gradient(135deg, var(--autumn-orange-dark) 0%, var(--autumn-orange) 100%);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-ghost {
  width: 100%;
  padding: 12px 24px;
  background: transparent;
  color: var(--autumn-orange);
  border: 2px solid var(--autumn-orange);
  border-radius: var(--radius-full);
  font-size: 15px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-ghost:hover {
  background: var(--autumn-orange);
  color: var(--autumn-white);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.error-message {
  color: var(--autumn-red);
  font-size: 14px;
  text-align: center;
  padding: var(--spacing-sm);
  background: rgba(220, 38, 38, 0.1);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-md);
  font-family: var(--font-body);
}

.auth-footer {
  margin-top: var(--spacing-md);
  text-align: center;
}

@media (max-width: 480px) {
  .auth-card {
    padding: var(--spacing-lg);
  }
  
  .auth-header h1 {
    font-size: 1.75rem;
  }
}
</style>


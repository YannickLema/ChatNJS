<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { state, loadMe, updateProfile } from '../store';

const router = useRouter();
const username = ref('');
const color = ref('#3498db');
const saving = ref(false);
const info = ref('');
const error = ref('');

onMounted(async () => {
  if (!state.token) return router.push('/login');
  if (!state.user) await loadMe();
  syncForm();
});

watch(
  () => state.user,
  () => syncForm(),
);

function syncForm() {
  username.value = state.user?.username ?? '';
  color.value = state.user?.color ?? '#3498db';
}

async function save() {
  if (!username.value.trim()) {
    error.value = 'Le pseudo ne peut pas être vide';
    info.value = '';
    return;
  }
  error.value = '';
  info.value = '';
  saving.value = true;
  try {
    await updateProfile({ username: username.value.trim(), color: color.value });
    info.value = 'Profil mis à jour';
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Erreur lors de la mise à jour';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="profile-page">
    <div class="card">
      <header>
        <div>
          <h1>Mon profil</h1>
          <p>Mettez à jour votre pseudo et votre couleur visible par tous.</p>
        </div>
        <button class="ghost" @click="router.push('/chat')">← Retour au chat</button>
      </header>

      <div class="form">
        <label class="field">
          <span>Pseudo</span>
          <input v-model="username" placeholder="Votre pseudo" />
        </label>

        <label class="field">
          <span>Couleur affichée</span>
          <div class="color-row">
            <input v-model="color" type="color" />
            <span class="color-preview" :style="{ background: color }" />
            <span class="color-value">{{ color }}</span>
          </div>
        </label>

        <button class="save" :disabled="saving" @click="save">
          {{ saving ? 'Sauvegarde...' : 'Mettre à jour' }}
        </button>

        <p v-if="info" class="info success">{{ info }}</p>
        <p v-if="error" class="info error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--autumn-cream) 0%, var(--autumn-beige) 100%);
  padding: var(--spacing-lg);
}

.card {
  width: min(560px, 100%);
  background: var(--autumn-white);
  border: 1px solid rgba(217, 119, 6, 0.15);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 2px solid var(--autumn-border);
}

header h1 {
  margin: 0;
  font-size: 2rem;
  font-family: var(--font-display);
  color: var(--autumn-brown);
  font-weight: 700;
}

header p {
  margin: var(--spacing-xs) 0 0;
  color: var(--autumn-gray);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.5;
}

.ghost {
  background: transparent;
  border: 2px solid var(--autumn-orange);
  color: var(--autumn-orange);
  padding: 10px 20px;
  border-radius: var(--radius-full);
  cursor: pointer;
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 14px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.ghost:hover {
  background: var(--autumn-orange);
  color: var(--autumn-white);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  font-size: 15px;
  color: var(--autumn-gray-dark);
  font-family: var(--font-body);
}

.field span {
  font-weight: 600;
  color: var(--autumn-brown);
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field input[type='text'] {
  padding: 14px 18px;
  border: 2px solid var(--autumn-border);
  border-radius: var(--radius-md);
  font-size: 15px;
  font-family: var(--font-body);
  background: var(--autumn-white);
  color: var(--autumn-gray-dark);
  transition: all 0.3s ease;
}

.field input[type='text']:focus {
  border-color: var(--autumn-orange);
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.1);
  background: var(--autumn-cream);
}

.color-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  background: var(--autumn-cream);
  border-radius: var(--radius-md);
  border: 2px solid var(--autumn-border);
}

.color-row input[type='color'] {
  width: 60px;
  height: 50px;
  padding: 0;
  border: 2px solid var(--autumn-border);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.color-row input[type='color']:hover {
  border-color: var(--autumn-orange);
  transform: scale(1.05);
}

.color-preview {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 2px solid var(--autumn-border);
  box-shadow: var(--shadow-sm);
}

.color-value {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: var(--autumn-gray);
  font-weight: 600;
  background: var(--autumn-white);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--autumn-border);
}

.save {
  align-self: flex-start;
  padding: 14px 32px;
  border: none;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  cursor: pointer;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
}

.save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  background: linear-gradient(135deg, var(--autumn-orange-dark) 0%, var(--autumn-orange) 100%);
}

.save:active:not(:disabled) {
  transform: translateY(0);
}

.save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.info {
  margin: 0;
  font-size: 14px;
  font-family: var(--font-body);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-weight: 500;
}

.info.success {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.1);
  border: 1px solid rgba(22, 163, 74, 0.2);
}

.info.error {
  color: var(--autumn-red);
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.2);
}

@media (max-width: 640px) {
  .card {
    padding: var(--spacing-lg);
  }
  
  header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  header h1 {
    font-size: 1.75rem;
  }
  
  .ghost {
    width: 100%;
    text-align: center;
  }
}
</style>


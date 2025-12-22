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
  background: #f3f4f6;
  padding: 24px;
}
.card {
  width: min(520px, 100%);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 20px 24px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
header h1 {
  margin: 0;
  font-size: 20px;
}
header p {
  margin: 4px 0 0;
  color: #6b7280;
}
.ghost {
  background: transparent;
  border: 1px solid #2563eb;
  color: #2563eb;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: #374151;
}
.field input[type='text'] {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.color-row input[type='color'] {
  width: 46px;
  height: 36px;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: transparent;
}
.color-preview {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}
.color-value {
  font-family: monospace;
  font-size: 13px;
  color: #6b7280;
}
.save {
  align-self: flex-start;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}
.save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.info {
  margin: 0;
  font-size: 14px;
}
.info.success {
  color: #16a34a;
}
.info.error {
  color: #dc2626;
}
</style>


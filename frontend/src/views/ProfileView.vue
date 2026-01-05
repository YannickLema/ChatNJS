<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { state, loadMe, updateProfile, fetchRooms } from '../store';

const router = useRouter();
const username = ref('');
const color = ref('#3498db');
const saving = ref(false);
const info = ref('');
const error = ref('');

onMounted(async () => {
  if (!state.token) {
    router.push('/login');
    return;
  }
  
  if (!state.user) {
    try {
      await loadMe();
    } catch (error) {
      router.push('/login');
      return;
    }
  }
  
  // Charger les salons pour les statistiques
  try {
    await fetchRooms();
  } catch (e) {
    // Ignorer les erreurs pour les stats
  }
  
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

// Calculer les statistiques
const userStats = computed(() => {
  const userMessages = Object.values(state.messagesCache).flat().filter(
    (msg) => msg.user === state.user?.username
  ).length;
  
  const userRooms = state.rooms.length;
  
  const totalMessages = Object.values(state.messagesCache).flat().length;
  
  return {
    messagesSent: userMessages,
    roomsJoined: userRooms,
    totalMessages,
  };
});

// Générer les initiales pour l'avatar
const userInitials = computed(() => {
  const name = state.user?.username || '';
  if (name.length === 0) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2 && parts[0] && parts[1]) {
    const first = parts[0][0] || '';
    const second = parts[1][0] || '';
    return (first + second).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});
</script>

<template>
  <div class="profile-page">
    <div class="profile-container">
      <!-- Section principale -->
      <div class="card main-card">
        <header>
          <div>
            <h1>Mon profil</h1>
            <p>Gérez vos informations et préférences</p>
          </div>
          <button class="ghost" @click="router.push('/chat')">← Retour au chat</button>
        </header>

        <!-- Avatar et infos utilisateur -->
        <div class="user-info-section">
          <div class="avatar-container">
            <div class="avatar" :style="{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }">
              <span class="avatar-initials">{{ userInitials }}</span>
            </div>
            <div class="avatar-badge" :style="{ background: color }"></div>
          </div>
          
          <div class="user-details">
            <h2 class="username">{{ state.user?.username || 'Utilisateur' }}</h2>
            <div class="user-meta">
              <div class="meta-item">
                <span class="meta-label">Email</span>
                <span class="meta-value">{{ state.user?.email || 'N/A' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">ID</span>
                <span class="meta-value">#{{ state.user?.id || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistiques -->
        <div class="stats-section">
          <h3 class="section-title">Statistiques</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">💬</div>
              <div class="stat-content">
                <div class="stat-value">{{ userStats.messagesSent }}</div>
                <div class="stat-label">Messages envoyés</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🏠</div>
              <div class="stat-content">
                <div class="stat-value">{{ userStats.roomsJoined }}</div>
                <div class="stat-label">Salons rejoints</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">👥</div>
              <div class="stat-content">
                <div class="stat-value">{{ state.users.length }}</div>
                <div class="stat-label">Utilisateurs actifs</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Formulaire de modification -->
        <div class="form-section">
          <h3 class="section-title">Modifier mon profil</h3>
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
              <p class="field-hint">Cette couleur apparaîtra à côté de votre nom dans le chat</p>
            </label>

            <button class="save" :disabled="saving" @click="save">
              {{ saving ? 'Sauvegarde...' : 'Mettre à jour' }}
            </button>

            <p v-if="info" class="info success">{{ info }}</p>
            <p v-if="error" class="info error">{{ error }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(135deg, var(--autumn-cream) 0%, var(--autumn-beige) 100%);
  padding: var(--spacing-lg);
}

.profile-container {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.card {
  background: var(--autumn-white);
  border: 1px solid rgba(217, 119, 6, 0.15);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.main-card {
  width: 100%;
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

/* Section utilisateur */
.user-info-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--autumn-cream);
  border-radius: var(--radius-lg);
  border: 2px solid rgba(217, 119, 6, 0.1);
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  border: 4px solid var(--autumn-white);
}

.avatar-initials {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--autumn-white);
  font-family: var(--font-display);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.avatar-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid var(--autumn-white);
  box-shadow: var(--shadow-sm);
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.username {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--autumn-brown);
  margin: 0;
}

.user-meta {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.meta-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--autumn-gray);
  font-weight: 600;
  font-family: var(--font-body);
}

.meta-value {
  font-size: 15px;
  color: var(--autumn-gray-dark);
  font-weight: 500;
  font-family: var(--font-body);
}

/* Section statistiques */
.stats-section {
  padding-top: var(--spacing-md);
  border-top: 2px solid var(--autumn-border);
}

.section-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--autumn-brown);
  margin-bottom: var(--spacing-md);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--autumn-cream);
  border-radius: var(--radius-md);
  border: 2px solid rgba(217, 119, 6, 0.1);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--autumn-orange);
}

.stat-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stat-value {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--autumn-brown);
}

.stat-label {
  font-size: 13px;
  color: var(--autumn-gray);
  font-weight: 500;
  font-family: var(--font-body);
}

/* Section formulaire */
.form-section {
  padding-top: var(--spacing-md);
  border-top: 2px solid var(--autumn-border);
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

.field-hint {
  font-size: 13px;
  color: var(--autumn-gray);
  font-style: italic;
  margin-top: var(--spacing-xs);
  font-family: var(--font-body);
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


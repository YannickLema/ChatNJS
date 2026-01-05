<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  state,
  sendMessage,
  sendTyping,
  sendReaction,
  connectSocket,
  loadMe,
  fetchRooms,
  selectRoom,
  createRoom,
  selectGeneral,
  fetchUsers,
  inviteUser,
  isInvited,
  logout,
} from '../store';

const router = useRouter();
const text = ref('');
const roomName = ref('');
const allowHistory = ref(false);
const showCreateModal = ref(false);
const showReactionsMenu = ref<{ messageId: string; x: number; y: number } | null>(null);
const userReactions = ref<Record<string, string>>({}); // messageId -> emoji
const searchQuery = ref('');
const showUserMenu = ref(false);
const showSearch = ref(false);

// Réactions disponibles
const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

// Fonction pour formater la date
function formatTime(dateString?: string): string {
  if (!dateString) return 'À l\'instant';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)}h`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'À l\'instant';
  }
}

// Filtrer les messages selon la recherche
const filteredMessages = computed(() => {
  if (!searchQuery.value.trim()) return state.messages;
  const query = searchQuery.value.toLowerCase();
  return state.messages.filter(msg => 
    msg.content.toLowerCase().includes(query) || 
    msg.user.toLowerCase().includes(query)
  );
});

// Initiales de l'utilisateur
const userInitials = computed(() => {
  const name = state.user?.username || '';
  if (name.length === 0) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2 && parts[0] && parts[1] && parts[0][0] && parts[1][0]) {
    const first = parts[0][0] || '';
    const second = parts[1][0] || '';
    return (first + second).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

// Nombre de participants dans le salon actuel
const participantsCount = computed(() => {
  if (state.currentRoomId === null) return state.users.length;
  // Pour les salons, on pourrait filtrer les utilisateurs invités
  return state.users.length;
});

onMounted(async () => {
  if (!state.token) {
    router.push('/login');
    return;
  }
  
  // Si l'utilisateur n'est pas chargé, essayer de le charger
  if (!state.user) {
    try {
      await loadMe();
    } catch (error) {
      // Token invalide, rediriger vers login
      router.push('/login');
      return;
    }
  }
  
  connectSocket();
  await fetchRooms();
  await fetchUsers();
  selectGeneral();
  
  // Fermer les menus quand on clique ailleurs
  document.addEventListener('click', (e) => {
    closeReactionsMenu();
    if (!(e.target as HTMLElement).closest('.user-menu-btn, .user-menu')) {
      showUserMenu.value = false;
    }
  });
});

function handleLogout() {
  logout();
  router.push('/login');
}

onBeforeUnmount(() => {
  document.removeEventListener('click', closeReactionsMenu);
});

const typingList = computed(() => state.typing.join(', '));
const currentRoomName = computed(() => {
  if (state.currentRoomId === null) return 'Chat général';
  const r = state.rooms.find((x) => x.id === state.currentRoomId);
  return r?.name ?? 'Salon';
});

function submit() {
  if (!text.value.trim()) return;
  sendMessage(text.value);
  text.value = '';
  sendTyping(undefined, false);
}

function onInput() {
  sendTyping(undefined, true);
}

async function createRoomAction() {
  if (!roomName.value.trim()) return;
  await createRoom({ name: roomName.value, allowHistoryForInvited: allowHistory.value });
  roomName.value = '';
  allowHistory.value = false;
  showCreateModal.value = false;
}

async function invite(userId: number) {
  if (state.currentRoomId === null) return;
  if (state.user?.id === userId) return; // on ne s'invite pas soi-même
  await inviteUser(state.currentRoomId, userId);
}

function onInviteClick(userId: number) {
  void invite(userId);
}

function handleReaction(messageId: string, emoji: string) {
  // Si l'utilisateur a déjà réagi à ce message, on remplace sa réaction
  const currentReaction = userReactions.value[messageId];
  if (currentReaction === emoji) {
    // Si c'est la même réaction, on la retire (optionnel)
    return;
  }
  
  // Enregistrer la réaction de l'utilisateur
  userReactions.value[messageId] = emoji;
  
  // Envoyer la réaction
  sendReaction(messageId, emoji);
  
  // Fermer le menu
  showReactionsMenu.value = null;
}

function openReactionsMenu(messageId: string, event: MouseEvent) {
  event.stopPropagation();
  const button = event.target as HTMLElement;
  const rect = button.getBoundingClientRect();
  
  // Positionner le menu au-dessus du bouton, centré
  showReactionsMenu.value = {
    messageId,
    x: rect.left + rect.width / 2,
    y: rect.top - 55,
  };
}

function closeReactionsMenu() {
  showReactionsMenu.value = null;
}

// Vérifier si l'utilisateur a déjà réagi à un message
function getUserReaction(messageId: string): string | null {
  return userReactions.value[messageId] || null;
}
</script>

<template>
  <div class="layout">
    <!-- Sidebar gauche -->
    <aside class="sidebar">
      <!-- Profil utilisateur -->
      <div class="user-profile-card">
        <div class="user-avatar" :style="{ background: `linear-gradient(135deg, ${state.user?.color || '#d97706'} 0%, ${state.user?.color || '#d97706'}dd 100%)` }">
          <span class="avatar-text">{{ userInitials }}</span>
        </div>
        <div class="user-info">
          <div class="user-name">{{ state.user?.username || 'Utilisateur' }}</div>
          <div class="user-status">
            <span class="status-dot"></span>
            <span>En ligne</span>
          </div>
        </div>
        <button class="user-menu-btn" @click.stop="showUserMenu = !showUserMenu">⋮</button>
        <div v-if="showUserMenu" class="user-menu" @click.stop>
          <button @click="router.push('/profil'); showUserMenu = false">⚙️ Mon profil</button>
          <button @click="handleLogout(); showUserMenu = false">🚪 Déconnexion</button>
        </div>
      </div>

      <!-- Actions rapides -->
      <div class="quick-actions">
        <button class="action-btn primary" @click="showCreateModal = true">
          <span class="icon">➕</span>
          <span>Nouveau salon</span>
        </button>
      </div>

      <!-- Liste des salons -->
      <div class="rooms-section">
        <div class="section-header">
          <h3>Conversations</h3>
        </div>
        <div class="rooms-list">
          <div
            class="room-item"
            :class="{ active: state.currentRoomId === null }"
            @click="selectGeneral()"
          >
            <span class="room-icon">💬</span>
            <span class="room-name">Chat général</span>
            <span v-if="state.currentRoomId === null" class="room-indicator"></span>
          </div>
          <div
            v-for="r in state.rooms"
            :key="r.id"
            class="room-item"
            :class="{ active: state.currentRoomId === r.id }"
            @click="selectRoom(r.id)"
          >
            <span class="room-icon">🏠</span>
            <span class="room-name">{{ r.name }}</span>
            <span v-if="state.currentRoomId === r.id" class="room-indicator"></span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Zone de chat principale -->
    <section class="chat-container">
      <!-- Header du chat -->
      <header class="chat-header">
        <div class="header-left">
          <div class="room-info">
            <h2 class="room-title">{{ currentRoomName }}</h2>
            <p class="room-meta">{{ participantsCount }} participant{{ participantsCount > 1 ? 's' : '' }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-btn" title="Rechercher" @click="showSearch = !showSearch">
            <span>🔍</span>
          </button>
        </div>
      </header>

      <!-- Barre de recherche -->
      <div v-if="showSearch" class="search-bar">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher dans les messages..." 
          class="search-input"
        />
        <button @click="searchQuery = ''; showSearch = false" class="search-close">✕</button>
        <span v-if="searchQuery" class="search-results">{{ filteredMessages.length }} résultat{{ filteredMessages.length > 1 ? 's' : '' }}</span>
      </div>

      <!-- Zone des messages -->
      <main class="messages-container">
        <div v-if="filteredMessages.length === 0" class="empty-state">
          <div class="empty-icon">💬</div>
          <p class="empty-text">{{ searchQuery ? 'Aucun résultat trouvé' : 'Aucun message pour le moment' }}</p>
          <p class="empty-hint">{{ searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Commencez la conversation !' }}</p>
        </div>
        
        <div class="messages-list">
          <div 
            v-for="m in filteredMessages" 
            :key="m.id" 
            class="message-wrapper"
            :class="{ 
              'msg-own': m.user === state.user?.username
            }"
          >
            <div class="message">
              <div v-if="m.user !== state.user?.username" class="message-avatar" :style="{ background: m.color || '#d97706' }">
                {{ m.user.substring(0, 2).toUpperCase() }}
              </div>
              <div class="message-content">
                <div v-if="m.user !== state.user?.username" class="message-header">
                  <span class="message-author" :style="{ color: m.color || '#d97706' }">{{ m.user }}</span>
                  <span class="message-time">{{ formatTime(m.createdAt) }}</span>
                </div>
                <div class="message-bubble" :class="{ 'own': m.user === state.user?.username }">
                  <p class="message-text">{{ m.content }}</p>
                  <div v-if="m.reactions && Object.keys(m.reactions).length > 0" class="message-reactions">
                    <span 
                      v-for="(count, emoji) in m.reactions" 
                      :key="emoji" 
                      class="reaction-item"
                      :class="{ 'reaction-active': getUserReaction(m.id) === emoji }"
                    >
                      {{ emoji }} {{ count }}
                    </span>
                  </div>
                </div>
                <div v-if="m.user === state.user?.username" class="message-time own-time">{{ formatTime(m.createdAt) }}</div>
              </div>
              <button 
                class="message-react-btn" 
                @click.stop="openReactionsMenu(m.id, $event)"
                :title="getUserReaction(m.id) ? `Votre réaction: ${getUserReaction(m.id)}` : 'Ajouter une réaction'"
              >
                {{ getUserReaction(m.id) || '👍' }}
              </button>
            </div>
          </div>
        </div>
      </main>
      
      <!-- Menu de réactions -->
      <Teleport to="body">
        <div 
          v-if="showReactionsMenu" 
          class="reactions-menu"
          :style="{ left: showReactionsMenu.x + 'px', top: showReactionsMenu.y + 'px' }"
          @click.stop
        >
          <button
            v-for="emoji in availableReactions"
            :key="emoji"
            class="reaction-option"
            :class="{ 'reaction-selected': getUserReaction(showReactionsMenu.messageId) === emoji }"
            @click="handleReaction(showReactionsMenu.messageId, emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </Teleport>

      <!-- Indicateur de frappe -->
      <div v-if="typingList" class="typing-indicator">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
        <span class="typing-text">{{ typingList }} est en train d'écrire...</span>
      </div>

      <!-- Zone de saisie -->
      <footer class="chat-input-container">
        <form @submit.prevent="submit" class="chat-input-form">
          <div class="input-wrapper">
            <input 
              v-model="text" 
              @input="onInput" 
              placeholder="Écrivez un message..." 
              class="chat-input"
            />
            <button type="submit" class="send-btn" :disabled="!text.trim()">
              <span class="send-icon">➤</span>
            </button>
          </div>
        </form>
      </footer>
    </section>

    <!-- Sidebar droite - Participants -->
    <aside class="participants-sidebar">
      <div class="participants-header">
        <h3>Participants</h3>
        <span class="participants-count">{{ state.users.length }}</span>
      </div>
      <div class="participants-list">
        <div
          v-for="u in state.users"
          :key="u.id"
          class="participant-item"
          :class="{ 'is-me': u.id === state.user?.id }"
        >
          <div class="participant-avatar" :style="{ background: u.color || '#d97706' }">
            {{ u.username.substring(0, 2).toUpperCase() }}
          </div>
          <div class="participant-info">
            <div class="participant-name">
              {{ u.username }}
              <span v-if="u.id === state.user?.id" class="me-badge">Vous</span>
            </div>
          </div>
          <button
            v-if="state.currentRoomId !== null && u.id !== state.user?.id"
            class="invite-action"
            :class="{ 'invited': isInvited(state.currentRoomId, u.id) }"
            :disabled="isInvited(state.currentRoomId, u.id)"
            @click="onInviteClick(u.id)"
          >
            {{ isInvited(state.currentRoomId, u.id) ? '✓' : '+' }}
          </button>
        </div>
      </div>
    </aside>
  </div>

  <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
    <div class="modal">
      <h3>Créer un salon</h3>
      <input v-model="roomName" placeholder="Nom du salon" />
      <label class="checkbox">
        <input type="checkbox" v-model="allowHistory" /> Invités voient l'historique
      </label>
      <div class="modal-actions">
        <button class="ghost" @click="showCreateModal = false">Annuler</button>
        <button @click="createRoomAction">Créer</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 300px 1fr 280px;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  min-height: 100vh;
  background: linear-gradient(135deg, var(--autumn-cream) 0%, var(--autumn-beige) 100%);
  max-width: 1800px;
  margin: 0 auto;
}

/* ===== SIDEBAR GAUCHE ===== */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  background: var(--autumn-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(217, 119, 6, 0.1);
  height: calc(100vh - 32px);
  position: sticky;
  top: var(--spacing-md);
  overflow: hidden;
}

/* Profil utilisateur */
.user-profile-card {
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  position: relative;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
}

.avatar-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--autumn-white);
  font-family: var(--font-display);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.9;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.user-menu-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: var(--autumn-white);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.user-menu-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.user-menu {
  position: absolute;
  top: 100%;
  right: var(--spacing-md);
  background: var(--autumn-white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xs);
  z-index: 100;
  min-width: 180px;
  border: 1px solid var(--autumn-border);
}

.user-menu button {
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--autumn-gray-dark);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 14px;
  transition: all 0.2s ease;
}

.user-menu button:hover {
  background: var(--autumn-cream);
}

/* Actions rapides */
.quick-actions {
  padding: 0 var(--spacing-lg);
}

.action-btn {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-family: var(--font-body);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  box-shadow: var(--shadow-sm);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-btn .icon {
  font-size: 18px;
}

/* Section salons */
.rooms-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  padding: 0 var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
}

.section-header h3 {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--autumn-brown);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 12px;
}

.rooms-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--spacing-lg) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.room-item {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  transition: all 0.2s ease;
  position: relative;
  color: var(--autumn-gray-dark);
}

.room-item:hover {
  background: var(--autumn-cream);
}

.room-item.active {
  background: var(--autumn-orange);
  color: var(--autumn-white);
  box-shadow: var(--shadow-sm);
}

.room-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.room-name {
  flex: 1;
  font-weight: 500;
  font-size: 14px;
}

.room-indicator {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.6;
}

/* ===== ZONE DE CHAT ===== */
.chat-container {
  display: flex;
  flex-direction: column;
  background: var(--autumn-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(217, 119, 6, 0.1);
  height: calc(100vh - 32px);
  position: sticky;
  top: var(--spacing-md);
  overflow: hidden;
}

/* Header du chat */
.chat-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--autumn-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--autumn-white);
}

.header-left {
  flex: 1;
}

.room-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--autumn-brown);
  margin: 0 0 4px 0;
}

.room-meta {
  font-size: 13px;
  color: var(--autumn-gray);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.header-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--autumn-border);
  background: var(--autumn-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s ease;
}

.header-btn:hover {
  background: var(--autumn-cream);
  border-color: var(--autumn-orange);
}

/* Barre de recherche */
.search-bar {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--autumn-border);
  background: var(--autumn-cream);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.search-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--autumn-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  background: var(--autumn-white);
}

.search-close {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--autumn-white);
  cursor: pointer;
  color: var(--autumn-gray);
  font-size: 16px;
}

.search-results {
  font-size: 12px;
  color: var(--autumn-gray);
  white-space: nowrap;
}

/* Zone des messages */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  background: var(--autumn-cream);
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-xl);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.empty-text {
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--autumn-brown);
  margin: 0 0 var(--spacing-xs) 0;
}

.empty-hint {
  font-size: 14px;
  color: var(--autumn-gray);
  margin: 0;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.message-wrapper {
  display: flex;
  flex-direction: column;
}

.message-wrapper.msg-own {
  align-items: flex-end;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  max-width: 70%;
}

.message-wrapper.msg-own .message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--autumn-white);
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.message-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
}

.message-author {
  font-weight: 600;
  font-size: 14px;
}

.message-time {
  font-size: 11px;
  color: var(--autumn-gray);
}

.message-time.own-time {
  text-align: right;
  margin-top: 4px;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 18px;
  background: var(--autumn-white);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
}

.message-bubble.own {
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  border-bottom-right-radius: 4px;
}

.message-wrapper:not(.msg-own) .message-bubble {
  border-bottom-left-radius: 4px;
}

.message-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
}

.message-reactions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.reaction-item {
  font-size: 12px;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid transparent;
}

.message-bubble.own .reaction-item {
  background: rgba(255, 255, 255, 0.2);
  color: var(--autumn-white);
}

.reaction-item.reaction-active {
  background: var(--autumn-orange);
  color: var(--autumn-white);
  border-color: var(--autumn-orange-dark);
  font-weight: 600;
}

.message-react-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--autumn-border);
  background: var(--autumn-white);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 4px;
}

.message:hover .message-react-btn {
  opacity: 1;
}

.message-react-btn:hover {
  border-color: var(--autumn-orange);
  background: var(--autumn-cream);
  transform: scale(1.1);
}

/* Indicateur de frappe */
.typing-indicator {
  padding: var(--spacing-sm) var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: var(--autumn-white);
  border-top: 1px solid var(--autumn-border);
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--autumn-orange);
  animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

.typing-text {
  font-size: 13px;
  color: var(--autumn-gray);
  font-style: italic;
}

/* Zone de saisie */
.chat-input-container {
  padding: var(--spacing-lg);
  background: var(--autumn-white);
  border-top: 1px solid var(--autumn-border);
}

.chat-input-form {
  width: 100%;
}

.input-wrapper {
  display: flex;
  gap: var(--spacing-sm);
  background: var(--autumn-cream);
  border-radius: var(--radius-full);
  padding: 4px;
  border: 2px solid var(--autumn-border);
  transition: all 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: var(--autumn-orange);
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.1);
}

.chat-input {
  flex: 1;
  padding: 12px 20px;
  border: none;
  background: transparent;
  font-size: 15px;
  font-family: var(--font-body);
  color: var(--autumn-gray-dark);
  outline: none;
}

.chat-input::placeholder {
  color: var(--autumn-gray);
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  font-size: 18px;
}

/* ===== SIDEBAR DROITE - PARTICIPANTS ===== */
.participants-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--autumn-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(217, 119, 6, 0.1);
  height: calc(100vh - 32px);
  position: sticky;
  top: var(--spacing-md);
  overflow: hidden;
}

.participants-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--autumn-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.participants-header h3 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--autumn-brown);
  margin: 0;
}

.participants-count {
  background: var(--autumn-cream);
  color: var(--autumn-brown);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}

.participants-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.participant-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.participant-item:hover {
  background: var(--autumn-cream);
}

.participant-item.is-me {
  background: var(--autumn-beige);
}

.participant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--autumn-white);
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--autumn-gray-dark);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.me-badge {
  background: var(--autumn-orange);
  color: var(--autumn-white);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
}

.invite-action {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--autumn-border);
  background: var(--autumn-white);
  color: var(--autumn-orange);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.invite-action:hover:not(:disabled) {
  background: var(--autumn-orange);
  color: var(--autumn-white);
  border-color: var(--autumn-orange);
}

.invite-action:disabled,
.invite-action.invited {
  background: var(--autumn-gray-light);
  color: var(--autumn-gray);
  border-color: var(--autumn-border);
  cursor: not-allowed;
}

/* Menu de réactions */
.reactions-menu {
  position: fixed;
  background: var(--autumn-white);
  border-radius: 24px;
  padding: 8px;
  display: flex;
  gap: 4px;
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(217, 119, 6, 0.2);
  z-index: 1000;
  animation: popIn 0.2s ease-out;
  transform: translateX(-50%) translateY(-100%);
  margin-top: -8px;
}

.reaction-option {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--autumn-cream);
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.reaction-option:hover {
  background: var(--autumn-beige);
  transform: scale(1.15);
  border-color: var(--autumn-orange);
}

.reaction-option.reaction-selected {
  background: var(--autumn-orange);
  border-color: var(--autumn-orange-dark);
  transform: scale(1.1);
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-100%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(-100%) scale(1);
  }
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(146, 64, 14, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--autumn-white);
  padding: var(--spacing-xl);
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(217, 119, 6, 0.2);
}

.modal h3 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: var(--autumn-brown);
  margin-bottom: var(--spacing-sm);
}

.modal input[type='text'] {
  padding: 12px 16px;
  border: 2px solid var(--autumn-border);
  border-radius: var(--radius-md);
  font-size: 15px;
  font-family: var(--font-body);
  background: var(--autumn-white);
  color: var(--autumn-gray-dark);
}

.modal input[type='text']:focus {
  border-color: var(--autumn-orange);
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.1);
}

.checkbox {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--autumn-gray-dark);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.modal-actions button {
  padding: 10px 20px;
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  font-weight: 500;
  transition: all 0.3s ease;
}

.modal-actions .ghost {
  background: transparent;
  color: var(--autumn-orange);
  border: 2px solid var(--autumn-orange);
}

.modal-actions .ghost:hover {
  background: var(--autumn-orange);
  color: var(--autumn-white);
  transform: translateY(-2px);
}

.modal-actions button:last-child {
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  box-shadow: var(--shadow-sm);
}

.modal-actions button:last-child:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background: linear-gradient(135deg, var(--autumn-orange-dark) 0%, var(--autumn-orange) 100%);
}

/* Responsive */
@media (max-width: 1200px) {
  .layout {
    grid-template-columns: 260px 1fr 240px;
  }
}

@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
  
  .sidebar,
  .participants-sidebar,
  .chat-container {
    height: auto;
    position: relative;
    max-height: none;
  }
  
  .messages-container {
    max-height: 60vh;
  }
}
</style>


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
} from '../store';

const router = useRouter();
const text = ref('');
const roomName = ref('');
const allowHistory = ref(false);
const showCreateModal = ref(false);
const showReactionsMenu = ref<{ messageId: string; x: number; y: number } | null>(null);
const userReactions = ref<Record<string, string>>({}); // messageId -> emoji

// Réactions disponibles
const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

onMounted(async () => {
  if (!state.token) return router.push('/login');
  if (!state.user) await loadMe();
  connectSocket();
  await fetchRooms();
  await fetchUsers();
  selectGeneral();
  
  // Fermer le menu de réactions quand on clique ailleurs
  document.addEventListener('click', closeReactionsMenu);
});

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
    <aside class="sidebar">
      <div class="user">Connecté en tant que <strong>{{ state.user?.username }}</strong></div>
      <div class="side-actions">
        <button class="profile-btn" @click="router.push('/profil')">Mon profil</button>
        <button class="create-btn" @click="showCreateModal = true">+ Créer un salon</button>
      </div>
      <div class="rooms-list">
        <div
          class="room-item"
          :class="{ active: state.currentRoomId === null }"
          @click="selectGeneral()"
        >
          Chat général
        </div>
        <div class="divider">Salons</div>
        <div
          v-for="r in state.rooms"
          :key="r.id"
          class="room-item"
          :class="{ active: state.currentRoomId === r.id }"
          @click="selectRoom(r.id)"
        >
          {{ r.name }}
        </div>
      </div>
    </aside>

    <section class="chat">
      <header>
        <div>{{ currentRoomName }}</div>
      </header>

      <main>
        <div v-if="state.messages.length === 0" class="empty-state">
          <p>Aucun message pour le moment. Commencez la conversation !</p>
        </div>
        <div 
          v-for="m in state.messages" 
          :key="m.id" 
          class="msg"
          :class="{ 'msg-own': m.user === state.user?.username }"
        >
          <div class="msg-bubble">
            <div class="msg-header">
              <span class="author" :style="{ color: m.color || '#d97706' }">{{ m.user }}</span>
            </div>
            <div class="msg-text">{{ m.content }}</div>
            <div v-if="m.reactions && Object.keys(m.reactions).length > 0" class="reactions-bar">
              <span 
                v-for="(count, emoji) in m.reactions" 
                :key="emoji" 
                class="reaction-badge"
                :class="{ 'reaction-active': getUserReaction(m.id) === emoji }"
              >
                {{ emoji }} {{ count }}
              </span>
            </div>
          </div>
          <button 
            class="react-btn" 
            @click.stop="openReactionsMenu(m.id, $event)"
            :title="getUserReaction(m.id) ? `Votre réaction: ${getUserReaction(m.id)}` : 'Ajouter une réaction'"
          >
            {{ getUserReaction(m.id) || '👍' }}
          </button>
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

      <footer>
        <div class="typing" v-if="typingList">
          {{ typingList }} est en train d'écrire...
        </div>
        <form @submit.prevent="submit">
          <input v-model="text" @input="onInput" placeholder="Tape ton message..." />
          <button type="submit">Envoyer</button>
        </form>
      </footer>
    </section>

    <aside class="rightbar">
      <div class="right-title">Utilisateurs</div>
      <div class="users-list">
        <div
          v-for="u in state.users"
          :key="u.id"
          class="user-item"
          :class="{ disabled: u.id === state.user?.id || state.currentRoomId === null || isInvited(state.currentRoomId, u.id) }"
        >
          <div class="user-name">
            <span class="color-dot" :style="{ background: u.color || '#3498db' }"></span>
            {{ u.username }}
          </div>
          <button
            class="invite-btn"
            :disabled="u.id === state.user?.id || state.currentRoomId === null || isInvited(state.currentRoomId, u.id)"
            @click="state.currentRoomId !== null && u.id !== state.user?.id ? onInviteClick(u.id) : null"
          >
            {{ isInvited(state.currentRoomId, u.id) ? 'Invité' : 'Inviter' }}
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
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  min-height: 100vh;
  background: linear-gradient(135deg, var(--autumn-cream) 0%, var(--autumn-beige) 100%);
}

/* Sidebar gauche */
.sidebar {
  width: 280px;
  background: var(--autumn-white);
  border: 1px solid rgba(217, 119, 6, 0.15);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  height: fit-content;
  max-height: calc(100vh - 32px);
  position: sticky;
  top: var(--spacing-md);
}

.user {
  font-size: 14px;
  color: var(--autumn-gray);
  font-family: var(--font-body);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--autumn-border);
  margin-bottom: var(--spacing-sm);
}

.user strong {
  color: var(--autumn-brown);
  font-weight: 600;
}

.side-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.profile-btn {
  background: transparent;
  color: var(--autumn-orange);
  border: 2px solid var(--autumn-orange);
  border-radius: var(--radius-full);
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.3s ease;
}

.profile-btn:hover {
  background: var(--autumn-orange);
  color: var(--autumn-white);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.create-btn {
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  border: none;
  border-radius: var(--radius-full);
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  background: linear-gradient(135deg, var(--autumn-orange-dark) 0%, var(--autumn-orange) 100%);
}

.rooms-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  overflow-y: auto;
  flex: 1;
}

.room-item {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 2px solid var(--autumn-border);
  background: var(--autumn-white);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--autumn-gray-dark);
  transition: all 0.3s ease;
}

.room-item:hover {
  border-color: var(--autumn-orange);
  background: var(--autumn-cream);
  transform: translateX(4px);
}

.room-item.active {
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  border-color: var(--autumn-orange);
  box-shadow: var(--shadow-md);
  font-weight: 600;
}

.divider {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--autumn-gray);
  margin-top: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
  font-weight: 600;
  letter-spacing: 0.5px;
  font-family: var(--font-body);
}

/* Zone de chat principale */
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--autumn-white);
  border: 1px solid rgba(217, 119, 6, 0.15);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

header div {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--autumn-brown);
}

main {
  border: 1px solid rgba(217, 119, 6, 0.15);
  padding: var(--spacing-lg);
  min-height: 400px;
  max-height: calc(100vh - 280px);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  background: var(--autumn-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--autumn-gray);
  font-family: var(--font-body);
  font-style: italic;
}

.msg {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  max-width: 75%;
  animation: slideIn 0.3s ease-out;
}

.msg-own {
  align-self: flex-end;
  margin-left: auto;
}

.msg-bubble {
  background: var(--autumn-white);
  border-radius: 18px;
  padding: 10px 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  word-wrap: break-word;
  min-width: 0;
  flex: 1;
}

.msg-own .msg-bubble {
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  border-bottom-right-radius: 4px;
}

.msg:not(.msg-own) .msg-bubble {
  background: var(--autumn-white);
  color: var(--autumn-gray-dark);
  border-bottom-left-radius: 4px;
}

.msg-header {
  margin-bottom: 4px;
}

.author {
  font-weight: 600;
  font-family: var(--font-body);
  font-size: 13px;
  opacity: 0.9;
}

.msg-own .author {
  color: rgba(255, 255, 255, 0.9);
}

.msg-text {
  font-family: var(--font-body);
  line-height: 1.4;
  font-size: 15px;
  word-break: break-word;
}

.msg-own .msg-text {
  color: var(--autumn-white);
}

.reactions-bar {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.reaction-badge {
  font-size: 12px;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px 8px;
  border-radius: 12px;
  font-family: var(--font-body);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.msg-own .reaction-badge {
  background: rgba(255, 255, 255, 0.2);
  color: var(--autumn-white);
}

.reaction-badge.reaction-active {
  background: var(--autumn-orange);
  color: var(--autumn-white);
  border-color: var(--autumn-orange-dark);
  font-weight: 600;
}

.react-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--autumn-border);
  background: var(--autumn-white);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  opacity: 0;
  transform: scale(0.8);
}

.msg:hover .react-btn {
  opacity: 1;
  transform: scale(1);
}

.react-btn:hover {
  border-color: var(--autumn-orange);
  background: var(--autumn-cream);
  transform: scale(1.1);
}

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

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

footer {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.typing {
  color: var(--autumn-orange);
  font-size: 13px;
  font-style: italic;
  font-family: var(--font-body);
  padding-left: var(--spacing-sm);
}

footer form {
  display: flex;
  gap: var(--spacing-sm);
  background: var(--autumn-white);
  padding: var(--spacing-sm);
  border-radius: var(--radius-full);
  border: 2px solid rgba(217, 119, 6, 0.15);
  box-shadow: var(--shadow-sm);
}

footer input {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius-full);
  font-size: 15px;
  font-family: var(--font-body);
  background: transparent;
  color: var(--autumn-gray-dark);
}

footer input::placeholder {
  color: var(--autumn-gray);
}

footer input:focus {
  outline: none;
}

footer button {
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
}

footer button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background: linear-gradient(135deg, var(--autumn-orange-dark) 0%, var(--autumn-orange) 100%);
}

/* Sidebar droite - Utilisateurs */
.rightbar {
  width: 280px;
  background: var(--autumn-white);
  border: 1px solid rgba(217, 119, 6, 0.15);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  height: fit-content;
  max-height: calc(100vh - 32px);
  position: sticky;
  top: var(--spacing-md);
}

.right-title {
  font-weight: 600;
  color: var(--autumn-brown);
  font-family: var(--font-display);
  font-size: 1.25rem;
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--autumn-border);
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  overflow-y: auto;
  flex: 1;
}

.user-item {
  border: 2px solid var(--autumn-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
  background: var(--autumn-white);
  transition: all 0.3s ease;
}

.user-item:hover:not(.disabled) {
  border-color: var(--autumn-orange);
  background: var(--autumn-cream);
  transform: translateX(4px);
}

.user-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-family: var(--font-body);
  color: var(--autumn-gray-dark);
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--autumn-border);
  display: inline-block;
  box-shadow: var(--shadow-sm);
}

.invite-btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--autumn-orange) 0%, var(--autumn-orange-light) 100%);
  color: var(--autumn-white);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
}

.invite-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background: linear-gradient(135deg, var(--autumn-orange-dark) 0%, var(--autumn-orange) 100%);
}

.invite-btn:disabled {
  background: var(--autumn-gray-light);
  color: var(--autumn-gray);
  cursor: not-allowed;
  box-shadow: none;
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
@media (max-width: 1024px) {
  .layout {
    flex-direction: column;
  }
  
  .sidebar,
  .rightbar {
    width: 100%;
    position: relative;
    max-height: none;
  }
  
  main {
    max-height: 500px;
  }
}
</style>


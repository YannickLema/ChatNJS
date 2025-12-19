<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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

onMounted(async () => {
  if (!state.token) return router.push('/login');
  if (!state.user) await loadMe();
  connectSocket();
  await fetchRooms();
  await fetchUsers();
  selectGeneral();
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
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="user">Connecté en tant que <strong>{{ state.user?.username }}</strong></div>
      <button class="create-btn" @click="showCreateModal = true">+ Créer un salon</button>
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
        <div v-for="m in state.messages" :key="m.id" class="msg">
          <span class="author" :style="{ color: m.color || '#3498db' }">{{ m.user }}</span> :
          <span>{{ m.content }}</span>
          <small v-if="m.reactions">
            <span v-for="(count, emoji) in m.reactions" :key="emoji" class="reaction">
              {{ emoji }} {{ count }}
            </span>
          </small>
          <button class="react" @click="sendReaction(m.id, '👍')">👍</button>
          <button class="react" @click="sendReaction(m.id, '❤️')">❤️</button>
        </div>
      </main>

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
          <div class="user-name">{{ u.username }}</div>
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
  gap: 16px;
  padding: 16px;
}
.rightbar {
  width: 260px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.right-title {
  font-weight: 600;
  color: #111827;
}
.users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 60vh;
  overflow: auto;
}
.user-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.user-name {
  font-weight: 600;
}
.user-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.invite-btn {
  align-self: flex-start;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}
.invite-btn:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}
.sidebar {
  width: 240px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.user {
  font-size: 14px;
  color: #374151;
}
.create-btn {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
}
.rooms-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.room-item {
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
}
.room-item.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.divider {
  font-size: 12px;
  text-transform: uppercase;
  color: #9ca3af;
  margin-top: 4px;
}
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}
main {
  border: 1px solid #e5e7eb;
  padding: 12px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}
.msg {
  display: flex;
  gap: 8px;
  align-items: center;
}
.author {
  font-weight: 600;
}
.reaction,
.react {
  margin-left: 6px;
}
.react {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f3f4f6;
  padding: 4px 8px;
  cursor: pointer;
}
footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rooms {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.rooms select {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.new-room {
  display: flex;
  gap: 8px;
  align-items: center;
}
.new-room input[type='text'],
.new-room input[type='checkbox'] {
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}
.new-room button {
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
}
footer form {
  display: flex;
  gap: 8px;
}
footer input {
  flex: 1;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
footer button {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
}
.typing {
  color: #6b7280;
  font-size: 14px;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}
.modal input[type='text'] {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.checkbox {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.modal-actions button {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}
.modal-actions .ghost {
  background: #f3f4f6;
  color: #111827;
}
.modal-actions button:last-child {
  background: #2563eb;
  color: #fff;
}
</style>


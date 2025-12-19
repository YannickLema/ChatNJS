<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { state, sendMessage, sendTyping, sendReaction, connectSocket, loadMe } from '../store';

const router = useRouter();
const text = ref('');

onMounted(async () => {
  if (!state.token) return router.push('/login');
  if (!state.user) await loadMe();
  connectSocket();
});

const typingList = computed(() => state.typing.join(', '));

function submit() {
  if (!text.value.trim()) return;
  sendMessage(text.value);
  text.value = '';
  sendTyping(undefined, false);
}

function onInput() {
  sendTyping(undefined, true);
}
</script>

<template>
  <div class="chat">
    <header>
      <div>
        Connecté en tant que <strong>{{ state.user?.username }}</strong>
      </div>
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
  </div>
</template>

<style scoped>
.chat {
  max-width: 720px;
  margin: 20px auto;
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
</style>


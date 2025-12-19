import { reactive } from 'vue';
import type { Socket } from 'socket.io-client';
import { api, setAuthToken } from './services/api';
import { createSocket } from './services/socket';

type User = { email: string; username: string; color?: string };
type Message = {
  id: string;
  user: string;
  color?: string;
  content: string;
  createdAt?: string;
  reactions?: Record<string, number>;
  roomId?: string;
};

export const state = reactive({
  token: '' as string,
  user: null as null | User,
  socket: null as null | Socket,
  messages: [] as Message[],
  typing: [] as string[],
  rooms: [] as Array<{ id: string; name: string }>,
});

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  state.token = data.access_token;
  setAuthToken(state.token);
  await loadMe();
  connectSocket();
}

export async function register(email: string, password: string, username: string) {
  await api.post('/auth/register', { email, password, username });
  return login(email, password);
}

export async function loadMe() {
  const { data } = await api.get('/users/me');
  state.user = data;
}

export function connectSocket() {
  if (!state.token) return;
  if (state.socket) state.socket.disconnect();
  state.socket = createSocket(state.token);
  const s = state.socket;
  s.on('message', (msg: Message) => state.messages.push(msg));
  s.on('typing', (list: string[]) => (state.typing = list));
  s.on('reaction', (payload: { messageId: string; emoji: string; count: number }) => {
    const m = state.messages.find((x) => x.id === payload.messageId);
    if (!m) return;
    m.reactions = m.reactions || {};
    m.reactions[payload.emoji] = payload.count;
  });
}

export function sendMessage(content: string, roomId?: string) {
  state.socket?.emit('message', { content, roomId });
}

export function sendTyping(roomId?: string, isTyping = true) {
  state.socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { roomId });
}

export function sendReaction(messageId: string, emoji: string) {
  state.socket?.emit('reaction', { messageId, emoji });
}


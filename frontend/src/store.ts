import { reactive } from 'vue';
import type { Socket } from 'socket.io-client';
import { api, setAuthToken } from './services/api';
import { createSocket } from './services/socket';

type User = { id: number; email: string; username: string; color?: string };
type Message = {
  id: string;
  user: string;
  color?: string;
  content: string;
  createdAt?: string;
  reactions?: Record<string, number>;
  roomId?: number;
};

export const state = reactive({
  token: '' as string,
  user: null as null | User,
  socket: null as null | Socket,
  messages: [] as Message[],
  typing: [] as string[],
  rooms: [] as Array<{ id: number; name: string; allowHistoryForInvited?: boolean }>,
  currentRoomId: null as number | null,
  users: [] as User[],
  messagesCache: {} as Record<string, Message[]>,
  invitedCache: {} as Record<string, Set<number>>,
});

function roomKey(roomId: number | null) {
  return roomId === null ? 'general' : String(roomId);
}

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
  s.on('message', (msg: Message) => {
    const key = roomKey(msg.roomId ?? null);
    if (!state.messagesCache[key]) state.messagesCache[key] = [];
    state.messagesCache[key].push(msg);
    if (state.currentRoomId === (msg.roomId ?? null)) {
      state.messages = state.messagesCache[key];
    }
  });
  s.on('history', (payload: { roomId?: number; messages: Message[] }) => {
    const roomId = payload.roomId ?? null;
    const key = roomKey(roomId);
    state.messagesCache[key] = payload.messages;
    if (state.currentRoomId === roomId) {
      state.messages = payload.messages;
    }
  });
  s.on('typing', (list: string[]) => (state.typing = list));
  s.on('reaction', (payload: { messageId: string; emoji: string; count: number }) => {
    const m = state.messages.find((x) => x.id === payload.messageId);
    if (!m) return;
    m.reactions = m.reactions || {};
    m.reactions[payload.emoji] = payload.count;
  });
}

export function sendMessage(content: string, roomId?: string) {
  const rid = roomId ?? state.currentRoomId ?? undefined;
  state.socket?.emit('message', { content, roomId: rid });
}

export function sendTyping(roomId?: string, isTyping = true) {
  const rid = roomId ?? state.currentRoomId ?? undefined;
  state.socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { roomId: rid });
}

export function sendReaction(messageId: string, emoji: string) {
  state.socket?.emit('reaction', { messageId, emoji });
}

export async function fetchRooms() {
  const { data } = await api.get('/rooms');
  state.rooms = data;
  if (state.currentRoomId === null) return;
  if (data.length && state.currentRoomId) return;
  if (data.length) selectRoom(data[0].id);
}

export function selectRoom(roomId: number) {
  state.currentRoomId = roomId;
  const key = roomKey(roomId);
  state.messages = state.messagesCache[key] ?? [];
  state.typing = [];
  state.socket?.emit('room:join', { roomId });
}

export function selectGeneral() {
  state.currentRoomId = null;
  const key = roomKey(null);
  state.messages = state.messagesCache[key] ?? [];
  state.typing = [];
}

export async function fetchUsers() {
  const { data } = await api.get('/users');
  state.users = data;
}

export async function inviteUser(roomId: number, userId: number) {
  const room = state.rooms.find((r) => r.id === roomId);
  const canSeeHistory = room?.allowHistoryForInvited ?? false;
  await api.post(`/rooms/${roomId}/invite`, { userId, canSeeHistory });
  markInvited(roomId, userId);
}

export async function createRoom(payload: { name: string; allowHistoryForInvited?: boolean; members?: number[] }) {
  const { data } = await api.post('/rooms', payload);
  await fetchRooms();
  selectRoom(data.id);
  return data;
}

function markInvited(roomId: number | null, userId: number) {
  const key = roomKey(roomId);
  if (!state.invitedCache[key]) state.invitedCache[key] = new Set<number>();
  state.invitedCache[key].add(userId);
}

export function isInvited(roomId: number | null, userId: number) {
  const key = roomKey(roomId);
  return state.invitedCache[key]?.has(userId) ?? false;
}


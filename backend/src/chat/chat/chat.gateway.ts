import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../../auth/auth.service';
import { ChatService } from '../chat.service';
import { RoomsService } from '../../rooms/rooms.service';

type WsUser = { id: number; username: string; color?: string };

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private typingUsers = new Set<number>();
  private typingByRoom = new Map<number, Set<number>>();
  private usersById = new Map<number, { username: string; color?: string }>();

  constructor(
    private readonly auth: AuthService,
    private readonly chat: ChatService,
    private readonly rooms: RoomsService,
  ) {}

  async handleConnection(client: Socket) {
    const token = (client.handshake.auth as any)?.token as string | undefined;
    try {
      const user = this.auth.validateToken(token);
      (client.data as any).user = user;
      this.usersById.set(user.id, { username: user.username, color: user.color });
      // envoyer l'historique
      this.chat.getHistory(50).forEach((msg) => client.emit('message', msg));
    } catch (e) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client.data as any).user as WsUser | undefined;
    if (!user) return;
    this.usersById.delete(user.id);
    if (this.typingUsers.has(user.id)) {
      this.typingUsers.delete(user.id);
      this.broadcastTyping();
    }
  }

  @SubscribeMessage('message')
  handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: { content: string; roomId?: number | string }) {
    const user = (client.data as any).user as WsUser | undefined;
    if (!user || !payload?.content) return;
    const roomId = payload.roomId ? Number(payload.roomId) : undefined;
    if (roomId && !this.rooms.isMember(roomId, user.id)) return;
    const msg = this.chat.addMessage({
      userId: user.id,
      user: user.username,
      color: user.color,
      content: payload.content,
      roomId,
    });
    if (roomId) {
      this.server.to(`room-${roomId}`).emit('message', msg);
    } else {
      this.server.emit('message', msg);
    }
    if (this.typingUsers.has(user.id)) {
      this.typingUsers.delete(user.id);
      this.broadcastTyping();
    }
  }

  @SubscribeMessage('typing:start')
  typingStart(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId?: string }) {
    const user = (client.data as any).user as WsUser | undefined;
    if (!user) return;
    const roomId = payload?.roomId ? Number(payload.roomId) : undefined;
    if (roomId && !this.rooms.isMember(roomId, user.id)) return;
    if (roomId) {
      const set = this.typingByRoom.get(roomId) ?? new Set<number>();
      set.add(user.id);
      this.typingByRoom.set(roomId, set);
      this.broadcastTyping(roomId);
    } else {
      this.typingUsers.add(user.id);
      this.broadcastTyping();
    }
  }

  @SubscribeMessage('typing:stop')
  typingStop(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId?: string }) {
    const user = (client.data as any).user as WsUser | undefined;
    if (!user) return;
    const roomId = payload?.roomId ? Number(payload.roomId) : undefined;
    if (roomId && !this.rooms.isMember(roomId, user.id)) return;
    if (roomId) {
      const set = this.typingByRoom.get(roomId);
      if (set) {
        set.delete(user.id);
        this.typingByRoom.set(roomId, set);
      }
      this.broadcastTyping(roomId);
    } else {
      this.typingUsers.delete(user.id);
      this.broadcastTyping();
    }
  }

  @SubscribeMessage('reaction')
  reaction(@ConnectedSocket() client: Socket, @MessageBody() payload: { messageId: string; emoji: string }) {
    const user = (client.data as any).user as WsUser | undefined;
    if (!user || !payload?.messageId || !payload?.emoji) return;
    const res = this.chat.addReaction(payload.messageId, payload.emoji);
    if (res) this.server.emit('reaction', res);
  }

  @SubscribeMessage('room:join')
  joinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: number | string }) {
    const user = (client.data as any).user as WsUser | undefined;
    if (!user) return;
    const roomId = Number(payload.roomId);
    if (!this.rooms.isMember(roomId, user.id)) return;
    client.join(`room-${roomId}`);
    const canHistory = this.rooms.canSeeHistory(roomId, user.id);
    if (canHistory) {
      const hist = this.chat.getHistory(100, roomId);
      client.emit('history', { roomId, messages: hist });
    } else {
      client.emit('history', { roomId, messages: [] });
    }
  }

  private broadcastTyping(roomId?: number) {
    if (roomId) {
      const set = this.typingByRoom.get(roomId) ?? new Set<number>();
      const list = Array.from(set)
        .map((id) => this.usersById.get(id)?.username)
        .filter(Boolean) as string[];
      this.server.to(`room-${roomId}`).emit('typing', list);
    } else {
      const list = Array.from(this.typingUsers)
        .map((id) => this.usersById.get(id)?.username)
        .filter(Boolean) as string[];
      this.server.emit('typing', list);
    }
  }
}

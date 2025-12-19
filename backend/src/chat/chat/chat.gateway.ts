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
  private usersById = new Map<number, { username: string; color?: string }>();

  constructor(private readonly auth: AuthService, private readonly chat: ChatService) {}

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
  handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: { content: string; roomId?: string }) {
    const user = (client.data as any).user as WsUser | undefined;
    if (!user || !payload?.content) return;
    const msg = this.chat.addMessage({
      userId: user.id,
      user: user.username,
      color: user.color,
      content: payload.content,
      roomId: payload.roomId,
    });
    this.server.emit('message', msg);
    if (this.typingUsers.has(user.id)) {
      this.typingUsers.delete(user.id);
      this.broadcastTyping();
    }
  }

  @SubscribeMessage('typing:start')
  typingStart(@ConnectedSocket() client: Socket) {
    const user = (client.data as any).user as WsUser | undefined;
    if (!user) return;
    this.typingUsers.add(user.id);
    this.broadcastTyping();
  }

  @SubscribeMessage('typing:stop')
  typingStop(@ConnectedSocket() client: Socket) {
    const user = (client.data as any).user as WsUser | undefined;
    if (!user) return;
    this.typingUsers.delete(user.id);
    this.broadcastTyping();
  }

  @SubscribeMessage('reaction')
  reaction(@ConnectedSocket() client: Socket, @MessageBody() payload: { messageId: string; emoji: string }) {
    const user = (client.data as any).user as WsUser | undefined;
    if (!user || !payload?.messageId || !payload?.emoji) return;
    const res = this.chat.addReaction(payload.messageId, payload.emoji);
    if (res) this.server.emit('reaction', res);
  }

  private broadcastTyping() {
    const list = Array.from(this.typingUsers)
      .map((id) => this.usersById.get(id)?.username)
      .filter(Boolean) as string[];
    this.server.emit('typing', list);
  }
}

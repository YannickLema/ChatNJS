import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

type ChatMessage = {
  id: string;
  userId: number;
  user: string;
  color?: string;
  content: string;
  createdAt: string;
  roomId?: number;
  reactions?: Record<string, number>;
};

@Injectable()
export class ChatService {
  private messages: ChatMessage[] = [];

  getHistory(limit = 50, roomId?: number) {
    const filtered = roomId ? this.messages.filter((m) => m.roomId === roomId) : this.messages;
    return filtered.slice(-limit);
  }

  addMessage(data: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const msg: ChatMessage = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    this.messages.push(msg);
    return msg;
  }

  addReaction(messageId: string, emoji: string) {
    const msg = this.messages.find((m) => m.id === messageId);
    if (!msg) return null;
    msg.reactions = msg.reactions || {};
    msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
    return { messageId, emoji, count: msg.reactions[emoji] };
  }
}

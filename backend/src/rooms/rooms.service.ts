import { BadRequestException, Injectable } from '@nestjs/common';

type RoomMember = { userId: number; canSeeHistory: boolean };
type Room = {
  id: number;
  name: string;
  ownerId: number;
  members: RoomMember[];
  allowHistoryForInvited: boolean;
};

@Injectable()
export class RoomsService {
  private rooms: Room[] = [];
  private nextId = 1;

  create(name: string, ownerId: number, allowHistoryForInvited = false, memberIds: number[] = []) {
    const room: Room = {
      id: this.nextId++,
      name,
      ownerId,
      allowHistoryForInvited,
      members: [{ userId: ownerId, canSeeHistory: true }],
    };
    memberIds.forEach((uid) => {
      if (uid !== ownerId) room.members.push({ userId: uid, canSeeHistory: allowHistoryForInvited });
    });
    this.rooms.push(room);
    return room;
  }

  listForUser(userId: number): Room[] {
    return this.rooms.filter((r) => r.members.some((m) => m.userId === userId));
  }

  invite(roomId: number, userId: number, canSeeHistory?: boolean) {
    const room = this.rooms.find((r) => r.id === roomId);
    if (!room) throw new BadRequestException('Room not found');
    const allow = canSeeHistory ?? room.allowHistoryForInvited;
    const exists = room.members.find((m) => m.userId === userId);
    if (exists) {
      exists.canSeeHistory = allow;
    } else {
      room.members.push({ userId, canSeeHistory: allow });
    }
    return room;
  }

  isMember(roomId: number, userId: number) {
    const room = this.rooms.find((r) => r.id === roomId);
    return !!room?.members.find((m) => m.userId === userId);
  }

  canSeeHistory(roomId: number, userId: number) {
    const room = this.rooms.find((r) => r.id === roomId);
    return !!room?.members.find((m) => m.userId === userId && m.canSeeHistory);
  }
}

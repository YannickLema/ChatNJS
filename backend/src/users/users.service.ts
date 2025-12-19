import { BadRequestException, Injectable } from '@nestjs/common';

type CreateUserDto = { email: string; password: string; username: string; color?: string };
type User = { id: number; email: string; password: string; username: string; color?: string };

@Injectable()
export class UsersService {
  private users: User[] = [];
  private nextId = 1;

  create(payload: CreateUserDto): User {
    const exists = this.users.find((u) => u.email === payload.email);
    if (exists) throw new BadRequestException('Email already used');
    const user: User = {
      id: this.nextId++,
      email: payload.email,
      password: payload.password,
      username: payload.username,
      color: payload.color ?? '#3498db',
    };
    this.users.push(user);
    return user;
  }

  validateCredentials(email: string, password: string): User | null {
    const user = this.users.find((u) => u.email === email && u.password === password);
    return user ?? null;
  }

  findById(id: number): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  updateProfile(id: number, payload: { username?: string; color?: string }): User {
    const user = this.findById(id);
    if (!user) throw new BadRequestException('User not found');
    if (payload.username) user.username = payload.username;
    if (payload.color) user.color = payload.color;
    return user;
  }

  listSafe(): Array<Omit<User, 'password'>> {
    return this.users.map(({ password, ...rest }) => rest);
  }
}

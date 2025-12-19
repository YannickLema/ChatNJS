import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { randomUUID } from 'crypto';

type RegisterDto = { email: string; password: string; username: string };
type LoginDto = { email: string; password: string };

@Injectable()
export class AuthService {
  private tokenStore = new Map<string, number>();

  constructor(private readonly usersService: UsersService) {}

  register(payload: RegisterDto) {
    const user = this.usersService.create(payload);
    const token = this.issueToken(user.id);
    return { access_token: token, user };
  }

  login(payload: LoginDto) {
    const user = this.usersService.validateCredentials(payload.email, payload.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const token = this.issueToken(user.id);
    return { access_token: token, user };
  }

  validateToken(authHeader?: string) {
    if (!authHeader) throw new UnauthorizedException('Missing token');
    const token = authHeader.replace(/Bearer\s+/i, '').trim();
    const userId = this.tokenStore.get(token);
    if (!userId) throw new UnauthorizedException('Invalid token');
    const user = this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private issueToken(userId: number) {
    const token = randomUUID();
    this.tokenStore.set(token, userId);
    return token;
  }
}


import {
  Controller,
  Get,
  Inject,
  Patch,
  Req,
  Body,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  me(@Req() req: Request) {
    const auth = req.headers.authorization;
    const user = this.authService.validateToken(auth);
    if (!user) throw new UnauthorizedException();
    const { password, ...safe } = user as any;
    return safe;
  }

  @Patch('me')
  updateMe(@Req() req: Request, @Body() body: { username?: string; color?: string }) {
    const auth = req.headers.authorization;
    const user = this.authService.validateToken(auth);
    if (!user) throw new UnauthorizedException();
    const updated = this.usersService.updateProfile(user.id, {
      username: body.username,
      color: body.color,
    });
    const { password, ...safe } = updated as any;
    return safe;
  }

  @Get()
  list(@Req() req: Request) {
    const auth = req.headers.authorization;
    const user = this.authService.validateToken(auth);
    if (!user) throw new UnauthorizedException();
    return this.usersService.listSafe();
  }
}

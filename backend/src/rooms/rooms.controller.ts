import { Body, Controller, Get, Inject, Post, Req, UnauthorizedException, forwardRef } from '@nestjs/common';
import type { Request } from 'express';
import { RoomsService } from './rooms.service';
import { AuthService } from '../auth/auth.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Get()
  list(@Req() req: Request) {
    const user = this.authService.validateToken(req.headers.authorization);
    return this.roomsService.listForUser(user.id);
  }

  @Post()
  create(
    @Req() req: Request,
    @Body() body: { name: string; allowHistoryForInvited?: boolean; members?: number[] },
  ) {
    const user = this.authService.validateToken(req.headers.authorization);
    if (!user) throw new UnauthorizedException();
    return this.roomsService.create(
      body.name,
      user.id,
      body.allowHistoryForInvited ?? false,
      body.members ?? [],
    );
  }

  @Post(':id/invite')
  invite(
    @Req() req: Request,
    @Body() body: { userId: number; canSeeHistory?: boolean },
  ) {
    const user = this.authService.validateToken(req.headers.authorization);
    if (!user) throw new UnauthorizedException();
    return this.roomsService.invite(
      Number((req as any).params.id),
      body.userId,
      body.canSeeHistory ?? false,
    );
  }
}

import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat/chat.gateway';
import { ChatService } from './chat.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}

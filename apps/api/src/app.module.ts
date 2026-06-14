// 📌 NestJS 앱 전체 구조 선언. 어떤 Controller/Service/Module을 쓸지 여기서 등록한다.
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentModule } from './agent/agent.module';
import { AuthModule } from './auth/auth.module';
import { CommentModule } from './comment/comment.module';
import { McpModule } from './mcp/mcp.module';
import { PostModule } from './post/post.module';
import { PrismaModule } from './prisma/prisma.module';
import { RagModule } from './rag/rag.module';
import { SavedModule } from './saved/saved.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PostModule,
    CommentModule,
    SavedModule,
    McpModule,
    RagModule,
    AgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

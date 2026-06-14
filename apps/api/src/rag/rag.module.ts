import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OpenAiService } from './openai.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

@Module({
  imports: [PrismaModule],
  controllers: [RagController],
  providers: [OpenAiService, RagService],
  // PostModule이 게시글 작성/수정 시 임베딩을 갱신할 수 있도록 내보낸다.
  exports: [RagService, OpenAiService],
})
export class RagModule {}

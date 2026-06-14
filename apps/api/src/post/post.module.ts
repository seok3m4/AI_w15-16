// 📌 여행 코스 게시글 기능에 필요한 Controller와 Service를 묶는 모듈.
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  // 게시글 생성/수정 시 임베딩을 갱신하기 위해 RagModule을 가져온다.
  imports: [PrismaModule, RagModule],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}

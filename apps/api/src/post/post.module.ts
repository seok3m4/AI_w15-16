// 📌 여행 코스 게시글 기능에 필요한 Controller와 Service를 묶는 모듈.
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [PrismaModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}

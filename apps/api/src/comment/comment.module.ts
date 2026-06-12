// 📌 댓글 기능에 필요한 Controller와 Service를 묶는 모듈.
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}

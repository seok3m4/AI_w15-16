// 📌 게시글 댓글 작성/삭제 비즈니스 로직을 처리한다.
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

// 프론트에서 바로 쓰기 좋도록 댓글에 필요한 필드만 골라서 반환한다.
const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true,
    },
  },
};

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  // 게시글이 존재하는지 확인한 뒤 로그인 사용자를 작성자로 댓글을 만든다.
  async create(postId: string, authorId: string, dto: CreateCommentDto) {
    await this.assertPostExists(postId);

    return this.prisma.comment.create({
      data: {
        content: dto.content,
        postId,
        authorId,
      },
      select: commentSelect,
    });
  }

  // 댓글 작성자 본인인지 확인한 뒤 댓글을 삭제한다.
  async remove(postId: string, commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        authorId: true,
        postId: true,
      },
    });

    if (!comment || comment.postId !== postId) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('댓글 작성자만 삭제할 수 있습니다.');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    return { success: true };
  }

  // 댓글을 달기 전에 대상 게시글이 실제로 존재하는지 검사한다.
  private async assertPostExists(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
  }
}

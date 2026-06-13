// 📌 /posts/:postId/comments 경로의 댓글 작성/삭제 API를 제공한다.
import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    userId: string;
    email: string;
  };
};

@Controller('posts/:postId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // 로그인한 사용자가 특정 게시글에 댓글을 작성한다.
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Param('postId') postId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(postId, req.user.userId, dto);
  }

  // 로그인한 사용자가 특정 댓글에 좋아요를 누른다.
  @UseGuards(JwtAuthGuard)
  @Post(':commentId/like')
  like(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commentService.like(postId, commentId, req.user.userId);
  }

  // 로그인한 사용자가 특정 댓글 좋아요를 취소한다.
  @UseGuards(JwtAuthGuard)
  @Delete(':commentId/like')
  unlike(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commentService.unlike(postId, commentId, req.user.userId);
  }

  // 댓글 작성자 본인만 자신의 댓글을 삭제할 수 있다.
  @UseGuards(JwtAuthGuard)
  @Delete(':commentId')
  remove(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commentService.remove(postId, commentId, req.user.userId);
  }
}

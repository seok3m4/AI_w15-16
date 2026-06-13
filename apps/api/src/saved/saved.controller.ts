// 📌 게시글 저장("나중에 보기") API. 저장/해제와 내 저장 목록 조회를 제공한다.
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostService } from '../post/post.service';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    userId: string;
    email: string;
  };
};

@Controller()
export class SavedController {
  constructor(private readonly postService: PostService) {}

  // 로그인한 사용자가 게시글을 저장 목록에 추가한다.
  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/save')
  save(
    @Param('postId') postId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.postService.savePost(req.user.userId, postId);
  }

  // 로그인한 사용자가 게시글을 저장 목록에서 제거한다.
  @UseGuards(JwtAuthGuard)
  @Delete('posts/:postId/save')
  unsave(
    @Param('postId') postId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.postService.unsavePost(req.user.userId, postId);
  }

  // 마이페이지에서 보여줄 내가 저장한 게시글 목록을 조회한다.
  @UseGuards(JwtAuthGuard)
  @Get('me/saved-posts')
  mySaved(@Request() req: AuthenticatedRequest) {
    return this.postService.findSavedByUser(req.user.userId);
  }

  // 마이페이지에서 보여줄 내가 직접 작성한 게시글 목록을 조회한다.
  @UseGuards(JwtAuthGuard)
  @Get('me/posts')
  myPosts(@Request() req: AuthenticatedRequest) {
    return this.postService.findAuthoredByUser(req.user.userId);
  }
}

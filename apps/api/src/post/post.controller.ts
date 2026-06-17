// 📌 /posts 경로의 여행 코스 게시글 CRUD API를 제공한다.
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostService } from './post.service';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    userId: string;
    email: string;
  };
};

// 선택적 인증 요청: 비로그인이면 user가 없다.
type OptionalAuthRequest = ExpressRequest & {
  user?: {
    userId: string;
    email: string;
  };
};

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  // 로그인한 사용자가 새 여행 코스 게시글을 작성한다.
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreatePostDto) {
    return this.postService.create(req.user.userId, dto);
  }

  // 게시글 목록을 최신순으로 페이지네이션하고 검색어/태그 필터를 적용해 조회한다.
  // 로그인 상태면 각 게시글의 저장 여부(isSaved)도 함께 내려준다.
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(
    @Request() req: OptionalAuthRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('tag') tag?: string,
  ) {
    return this.postService.findAll(page, limit, q, tag, req.user?.userId);
  }

  // 특정 게시글의 상세 내용을 조회한다. 로그인 상태면 저장 여부도 함께 내려준다.
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: OptionalAuthRequest) {
    return this.postService.findOne(id, req.user?.userId);
  }

  // 작성자 본인만 게시글을 수정할 수 있다.
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postService.update(id, req.user.userId, dto);
  }

  // 작성자 본인만 게시글을 삭제할 수 있다.
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.postService.remove(id, req.user.userId);
  }
}

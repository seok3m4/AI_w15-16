// 📌 여행 코스 게시글 CRUD의 실제 비즈니스 로직을 처리한다.
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const postListInclude = {
  author: {
    select: {
      id: true,
      name: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
};

const postDetailInclude = {
  ...postListInclude,
  comments: {
    orderBy: {
      createdAt: 'asc' as const,
    },
    select: {
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
    },
  },
};

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  // 로그인한 사용자를 작성자로 연결해 새 여행 코스 게시글을 만든다.
  async create(authorId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        content: dto.content,
        city: dto.city,
        country: dto.country,
        duration: dto.duration ?? null,
        authorId,
      },
      include: postDetailInclude,
    });

    return this.serializePost(post);
  }

  // 최신순으로 게시글 목록을 가져오고 페이지네이션 메타 정보를 함께 반환한다.
  async findAll(page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        skip,
        take: safeLimit,
        orderBy: {
          createdAt: 'desc',
        },
        include: postListInclude,
      }),
      this.prisma.post.count(),
    ]);

    return {
      items: items.map((post) => this.serializePost(post)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  // 게시글 상세 정보를 작성자, 태그, 댓글 작성자 정보와 함께 조회한다.
  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: postDetailInclude,
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    return this.serializePost(post);
  }

  // 작성자 본인인지 확인한 뒤 게시글을 수정한다.
  async update(id: string, userId: string, dto: UpdatePostDto) {
    await this.assertAuthor(id, userId);

    const post = await this.prisma.post.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        city: dto.city,
        country: dto.country,
        duration: dto.duration ?? null,
      },
      include: postDetailInclude,
    });

    return this.serializePost(post);
  }

  // 작성자 본인인지 확인한 뒤 게시글을 삭제한다.
  async remove(id: string, userId: string) {
    await this.assertAuthor(id, userId);
    await this.prisma.post.delete({
      where: { id },
    });

    return { success: true };
  }

  // 수정/삭제 전에 게시글 존재 여부와 작성자 권한을 확인한다.
  private async assertAuthor(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        authorId: true,
      },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('게시글 작성자만 수정하거나 삭제할 수 있습니다.');
    }
  }

  // Prisma의 PostTag 중간 테이블 응답을 프론트에서 쓰기 쉬운 tags 배열로 정리한다.
  private serializePost(post) {
    return {
      ...post,
      tags: post.tags.map((postTag) => postTag.tag),
    };
  }
}

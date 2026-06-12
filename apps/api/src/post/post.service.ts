// 📌 여행 코스 게시글 CRUD의 실제 비즈니스 로직을 처리한다.
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PlaceInputDto } from './dto/place-input.dto';
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
  places: {
    orderBy: {
      order: 'asc' as const,
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

  // 로그인한 사용자를 작성자로 연결해 새 여행 코스 게시글을 만들고 태그를 붙인다.
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
      select: { id: true },
    });

    await this.syncTags(post.id, dto.tags ?? []);
    await this.syncPlaces(post.id, dto.places ?? []);

    return this.findOne(post.id);
  }

  // 최신순으로 게시글 목록을 가져오고 검색어/태그 필터와 페이지네이션을 적용한다.
  async findAll(page: number, limit: number, q?: string, tag?: string) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const skip = (safePage - 1) * safeLimit;

    const where = this.buildWhere(q, tag);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: {
          createdAt: 'desc',
        },
        include: postListInclude,
      }),
      this.prisma.post.count({ where }),
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

  // 작성자 본인인지 확인한 뒤 게시글 내용과 태그를 수정한다.
  async update(id: string, userId: string, dto: UpdatePostDto) {
    await this.assertAuthor(id, userId);

    await this.prisma.post.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        city: dto.city,
        country: dto.country,
        duration: dto.duration ?? null,
      },
      select: { id: true },
    });

    // tags를 보낸 경우에만 태그를 다시 맞춘다. (undefined면 기존 태그 유지)
    if (dto.tags !== undefined) {
      await this.syncTags(id, dto.tags);
    }

    // places도 보낸 경우에만 경유지를 새 목록으로 교체한다.
    if (dto.places !== undefined) {
      await this.syncPlaces(id, dto.places);
    }

    return this.findOne(id);
  }

  // 작성자 본인인지 확인한 뒤 게시글을 삭제한다.
  async remove(id: string, userId: string) {
    await this.assertAuthor(id, userId);
    await this.prisma.post.delete({
      where: { id },
    });

    return { success: true };
  }

  // 검색어(q)와 태그(tag) 조건을 Prisma where 절로 조립한다.
  private buildWhere(q?: string, tag?: string): Prisma.PostWhereInput {
    const where: Prisma.PostWhereInput = {};

    const keyword = q?.trim();
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const tagName = tag?.trim();
    if (tagName) {
      where.tags = {
        some: {
          tag: { name: { equals: tagName, mode: 'insensitive' } },
        },
      };
    }

    return where;
  }

  // 게시글의 태그를 입력받은 이름 목록과 똑같이 맞춘다. (없던 태그는 새로 만든다)
  private async syncTags(postId: string, rawTags: string[]) {
    const names = this.normalizeTags(rawTags);

    // 기존 연결을 모두 끊고 새 목록으로 다시 연결한다.
    await this.prisma.postTag.deleteMany({ where: { postId } });

    if (names.length === 0) {
      return;
    }

    // 같은 이름의 태그가 이미 있으면 재사용하고, 없으면 새로 만든다.
    const tags = await Promise.all(
      names.map((name) =>
        this.prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    );

    await this.prisma.postTag.createMany({
      data: tags.map((tag) => ({ postId, tagId: tag.id })),
      skipDuplicates: true,
    });
  }

  // 태그 이름의 앞뒤 공백을 정리하고 빈 값과 중복을 제거한다.
  private normalizeTags(rawTags: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const raw of rawTags) {
      const name = raw.trim();
      const key = name.toLowerCase();
      if (name && !seen.has(key)) {
        seen.add(key);
        result.push(name);
      }
    }

    return result;
  }

  // 게시글의 경유지를 입력받은 목록과 똑같이 맞춘다. (기존 경유지는 모두 지우고 다시 만든다)
  private async syncPlaces(postId: string, places: PlaceInputDto[]) {
    await this.prisma.place.deleteMany({ where: { postId } });

    if (places.length === 0) {
      return;
    }

    // 보낸 순서(order) 기준으로 정렬해 0부터 다시 매겨 저장한다.
    const sorted = [...places].sort((a, b) => a.order - b.order);

    await this.prisma.place.createMany({
      data: sorted.map((place, index) => ({
        postId,
        name: place.name,
        address: place.address ?? null,
        lat: place.lat,
        lng: place.lng,
        order: index,
      })),
    });
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

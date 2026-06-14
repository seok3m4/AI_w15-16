// 📌 여행 코스 게시글 CRUD의 실제 비즈니스 로직을 처리한다.
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PlaceInputDto } from './dto/place-input.dto';
import { UpdatePostDto } from './dto/update-post.dto';

// 목록/상세 공통 include. userId가 있으면 그 사용자의 저장 여부(savedBy)도 함께 가져온다.
function buildPostInclude(userId?: string): Prisma.PostInclude {
  return {
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
    // 저장된 횟수(saveCount) 계산용
    _count: {
      select: {
        savedBy: true,
      },
    },
    // 로그인한 경우에만 본인이 저장했는지 확인한다.
    ...(userId
      ? {
          savedBy: {
            where: { userId },
            select: { userId: true },
          },
        }
      : {}),
  };
}

function buildPostDetailInclude(userId?: string): Prisma.PostInclude {
  return {
    ...buildPostInclude(userId),
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
        // 댓글별 좋아요 수 계산용
        _count: {
          select: {
            likes: true,
          },
        },
        // 로그인한 경우에만 내가 누른 댓글 좋아요 여부를 확인한다.
        ...(userId
          ? {
              likes: {
                where: { userId },
                select: { userId: true },
              },
            }
          : {}),
      },
    },
  };
}

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService,
  ) {}

  // 게시글 임베딩을 갱신한다. 실패해도 게시글 작성/수정 자체는 막지 않는다.
  private async refreshEmbedding(postId: string) {
    try {
      await this.ragService.upsertEmbedding(postId);
    } catch (err) {
      this.logger.warn(
        `게시글 ${postId} 임베딩 갱신 실패 (게시글 저장은 정상): ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  // 로그인한 사용자를 작성자로 연결해 새 여행 코스 게시글을 만들고 태그를 붙인다.
  async create(authorId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        content: dto.content,
        city: dto.city,
        duration: dto.duration ?? null,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        authorId,
      },
      select: { id: true },
    });

    await this.syncTags(post.id, dto.tags ?? []);
    await this.syncPlaces(post.id, dto.places ?? []);
    await this.refreshEmbedding(post.id);

    return this.findOne(post.id, authorId);
  }

  // 최신순으로 게시글 목록을 가져오고 검색어/태그 필터와 페이지네이션을 적용한다.
  async findAll(
    page: number,
    limit: number,
    q?: string,
    tag?: string,
    userId?: string,
  ) {
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
        include: buildPostInclude(userId),
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
  async findOne(id: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: buildPostDetailInclude(userId),
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    return this.serializePost(post);
  }

  // 사용자가 저장("나중에 보기")한 게시글 목록을 최근 저장 순으로 가져온다.
  async findSavedByUser(userId: string) {
    const saved = await this.prisma.savedPost.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: buildPostInclude(userId),
        },
      },
    });

    return saved.map((entry) => this.serializePost(entry.post));
  }

  // 마이페이지에서 보여줄 내가 작성한 게시글 목록을 최신순으로 가져온다.
  async findAuthoredByUser(userId: string) {
    const posts = await this.prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: buildPostInclude(userId),
    });

    return posts.map((post) => this.serializePost(post));
  }

  // 게시글을 사용자의 저장 목록에 추가한다. (이미 저장돼 있으면 그대로 둔다)
  async savePost(userId: string, postId: string) {
    await this.assertPostExists(postId);

    await this.prisma.savedPost.upsert({
      where: { userId_postId: { userId, postId } },
      update: {},
      create: { userId, postId },
    });

    const saveCount = await this.prisma.savedPost.count({ where: { postId } });
    return { saved: true, saveCount };
  }

  // 게시글을 사용자의 저장 목록에서 제거한다.
  async unsavePost(userId: string, postId: string) {
    await this.assertPostExists(postId);

    await this.prisma.savedPost.deleteMany({ where: { userId, postId } });

    const saveCount = await this.prisma.savedPost.count({ where: { postId } });
    return { saved: false, saveCount };
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
        duration: dto.duration ?? null,
        thumbnailUrl: dto.thumbnailUrl ?? null,
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

    // 제목·본문·태그·코스가 바뀌었을 수 있으니 임베딩을 다시 만든다.
    await this.refreshEmbedding(id);

    return this.findOne(id, userId);
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

  // 저장/해제 전에 게시글이 존재하는지 확인한다.
  private async assertPostExists(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
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

  // Prisma 응답을 프론트에서 쓰기 쉬운 형태로 정리한다.
  // tags 평탄화 + 저장 횟수(saveCount) + 본인 저장 여부(isSaved)를 덧붙인다.
  private serializePost(post) {
    const { _count, savedBy, ...rest } = post;
    return {
      ...rest,
      tags: post.tags.map((postTag) => postTag.tag),
      ...(Array.isArray(post.comments)
        ? {
            comments: post.comments.map((comment) =>
              this.serializeComment(comment),
            ),
          }
        : {}),
      saveCount: _count?.savedBy ?? 0,
      isSaved: Array.isArray(savedBy) && savedBy.length > 0,
    };
  }

  // 댓글 응답에 좋아요 수와 현재 사용자의 좋아요 여부를 덧붙인다.
  private serializeComment(comment) {
    const { _count, likes, ...rest } = comment;
    return {
      ...rest,
      likeCount: _count?.likes ?? 0,
      isLiked: Array.isArray(likes) && likes.length > 0,
    };
  }
}

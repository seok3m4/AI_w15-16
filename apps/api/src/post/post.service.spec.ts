import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostService } from './post.service';

const createdAt = new Date('2026-06-11T00:00:00.000Z');
const updatedAt = new Date('2026-06-11T00:00:00.000Z');

const postWithRelations = {
  id: 'post_1',
  title: '오사카 3박 4일',
  content: '현지 맛집 중심 코스입니다.',
  city: '오사카',
  duration: 4,
  authorId: 'user_1',
  createdAt,
  updatedAt,
  author: {
    id: 'user_1',
    name: '김민지',
  },
  tags: [
    {
      tag: {
        id: 'tag_1',
        name: '맛집',
      },
    },
  ],
  places: [],
  comments: [],
  _count: {
    savedBy: 0,
  },
  savedBy: [],
};

describe('PostService', () => {
  let postService: PostService;
  let prisma: {
    post: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    tag: {
      upsert: jest.Mock;
    };
    postTag: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    place: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      post: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tag: {
        upsert: jest.fn(),
      },
      postTag: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      place: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
    };

    postService = new PostService(prisma as unknown as PrismaService);
  });

  // 게시글 작성 시 로그인한 사용자의 id를 authorId로 저장해야 한다.
  it('creates a post for the current user', async () => {
    prisma.post.create.mockResolvedValue({ id: 'post_1' });
    prisma.post.findUnique.mockResolvedValue(postWithRelations);
    prisma.postTag.deleteMany.mockResolvedValue({ count: 0 });
    prisma.place.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      postService.create('user_1', {
        title: '오사카 3박 4일',
        content: '현지 맛집 중심 코스입니다.',
        city: '오사카',
        duration: 4,
      }),
    ).resolves.toMatchObject({
      id: 'post_1',
      author: { name: '김민지' },
      tags: [{ id: 'tag_1', name: '맛집' }],
    });

    expect(prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorId: 'user_1',
          city: '오사카',
        }),
      }),
    );
  });

  // 목록 조회는 페이지네이션 정보와 작성자/태그를 함께 반환해야 한다.
  it('returns paginated posts with authors and tags', async () => {
    prisma.post.findMany.mockResolvedValue([postWithRelations]);
    prisma.post.count.mockResolvedValue(1);

    await expect(postService.findAll(1, 10)).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'post_1',
          author: { id: 'user_1', name: '김민지' },
          tags: [{ id: 'tag_1', name: '맛집' }],
        }),
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
  });

  // 존재하지 않는 id로 상세 조회하면 404를 반환해야 한다.
  it('throws 404 when a post does not exist', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(postService.findOne('missing_post')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // 작성자가 아닌 사용자는 게시글을 수정할 수 없어야 한다.
  it('throws 403 when updating another user post', async () => {
    prisma.post.findUnique.mockResolvedValue({ authorId: 'other_user' });

    await expect(
      postService.update('post_1', 'user_1', {
        title: '수정 제목',
        content: '수정 내용',
        city: '파리',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // 작성자는 본인의 게시글을 삭제할 수 있어야 한다.
  it('deletes a post when current user is author', async () => {
    prisma.post.findUnique.mockResolvedValue({ authorId: 'user_1' });
    prisma.post.delete.mockResolvedValue(postWithRelations);

    await expect(postService.remove('post_1', 'user_1')).resolves.toEqual({
      success: true,
    });

    expect(prisma.post.delete).toHaveBeenCalledWith({
      where: { id: 'post_1' },
    });
  });
});

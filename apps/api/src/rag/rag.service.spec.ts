import { PrismaService } from '../prisma/prisma.service';
import { OpenAiService } from './openai.service';
import { RagService } from './rag.service';

describe('RagService', () => {
  let ragService: RagService;
  let prisma: {
    post: {
      findMany: jest.Mock;
    };
    place: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      post: {
        findMany: jest.fn(),
      },
      place: {
        findMany: jest.fn(),
      },
    };

    // 📌 OpenAI 키가 없거나 임베딩이 비어 있는 상황을 테스트하기 위한 최소 mock.
    const openai = {
      enabled: false,
    };

    ragService = new RagService(
      prisma as unknown as PrismaService,
      openai as unknown as OpenAiService,
    );
  });

  // 임베딩이 없어도 도시/기간/태그 키워드로 관련 게시글을 찾아야 한다.
  it('falls back to keyword search when vector search is unavailable', async () => {
    prisma.post.findMany.mockResolvedValue([
      {
        id: 'jeju_family',
        title: '제주 가족 여행 3박 4일 서쪽·남쪽 여유 코스',
        content: '부모님이나 아이와 함께 가는 제주 가족 여행 코스입니다.',
        city: '제주',
        duration: 4,
        thumbnailUrl: null,
        author: { name: '김민지' },
        tags: [{ tag: { name: '가족' } }, { tag: { name: '자연' } }],
      },
      {
        id: 'jeju_three_days',
        title: '제주 2박 3일 자연과 가성비 코스',
        content: '렌터카로 동쪽 해안도로와 오름을 중심으로 움직입니다.',
        city: '제주',
        duration: 3,
        thumbnailUrl: null,
        author: { name: '이도현' },
        tags: [{ tag: { name: '자연' } }, { tag: { name: '가성비' } }],
      },
      {
        id: 'gyeongju_family',
        title: '경주 가족 여행 2박 3일 느린 역사 코스',
        content: '아이와 함께 역사 공부를 겸한 여행으로 좋습니다.',
        city: '경주',
        duration: 3,
        thumbnailUrl: null,
        author: { name: '박서연' },
        tags: [{ tag: { name: '가족' } }, { tag: { name: '역사' } }],
      },
    ]);
    prisma.place.findMany.mockResolvedValue([
      {
        postId: 'jeju_family',
        name: '협재해수욕장',
        address: '제주시 한림읍 협재리',
        day: 2,
        order: 2,
      },
      {
        postId: 'jeju_three_days',
        name: '성산일출봉',
        address: '서귀포시 성산읍',
        day: 2,
        order: 1,
      },
    ]);

    const results = await ragService.searchByQuery(
      '가족이랑 가기 좋은 2박3일 제주도 여행 추천해줘',
      2,
    );

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 'jeju_family',
      city: '제주',
      authorName: '김민지',
      places: [
        expect.objectContaining({
          name: '협재해수욕장',
          day: 2,
        }),
      ],
    });
    expect(results[1]).toMatchObject({
      id: 'jeju_three_days',
      city: '제주',
      duration: 3,
    });
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: [] },
          OR: expect.any(Array),
        }),
      }),
    );
  });
});

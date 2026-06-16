// 📌 RAG(검색 증강 생성) 핵심 로직.
// 게시글을 임베딩으로 저장하고, pgvector 코사인 거리로 유사 코스를 찾고,
// 검색된 코스를 컨텍스트로 넣어 게시판 Q&A 답변을 생성한다.
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAiService } from './openai.service';

// 유사 코스 검색 결과 한 건.
export type SimilarPost = {
  id: string;
  title: string;
  city: string;
  content: string;
  duration: number | null;
  thumbnailUrl: string | null;
  authorName: string;
  places: SimilarPostPlace[];
  similarity: number; // 0~1, 1에 가까울수록 유사
};

// 유사 코스 응답에 붙이는 경유지 정보. Agent가 일차별 동선을 설명할 때 사용한다.
export type SimilarPostPlace = {
  name: string;
  address: string | null;
  day: number;
  order: number;
};

// 코사인 유사도가 이 값 미만이면 "관련이 약하다"고 보고 결과에서 제외한다.
// 무조건 상위 N개를 채우는 대신, 충분히 가까운 코스만 추천/출처로 쓴다.
const SIMILARITY_THRESHOLD = 0.33;

// 📌 사용자가 "제주도"처럼 말해도 DB의 city 값 "제주"와 맞출 수 있게 하는 별칭 목록.
const CITY_ALIASES: Record<string, string[]> = {
  제주: ['제주', '제주도', '제주시', '서귀포', '서귀포시'],
  서울: ['서울', '서울시'],
  부산: ['부산', '부산시'],
  강릉: ['강릉', '강릉시'],
  경주: ['경주', '경주시'],
  전주: ['전주', '전주시'],
  오사카: ['오사카'],
  파리: ['파리'],
};

// 📌 검색 품질에 도움이 되는 여행 키워드. 태그/제목/본문 fallback 검색에 사용한다.
const TRAVEL_KEYWORDS = [
  '가족',
  '아이',
  '부모님',
  '혼행',
  '커플',
  '맛집',
  '자연',
  '도심',
  '가성비',
  '힐링',
  '바다',
  '역사',
  '야경',
  '비',
  '실내',
  '카페',
  '드라이브',
];

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiService,
  ) {}

  // 게시글의 제목·도시·본문·태그를 한 텍스트로 합쳐 임베딩 대상 문자열을 만든다.
  private buildEmbedText(post: {
    title: string;
    city: string;
    content: string;
    tags: { tag: { name: string } }[];
    places: { name: string; day?: number }[];
  }): string {
    const tagNames = post.tags.map((t) => t.tag.name).join(', ');
    const placeNames = post.places
      .map((p) => `${p.day ?? 1}일차 ${p.name}`)
      .join(', ');
    return [
      `제목: ${post.title}`,
      `지역: ${post.city}`,
      tagNames ? `태그: ${tagNames}` : '',
      placeNames ? `코스: ${placeNames}` : '',
      `내용: ${post.content}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // 게시글 하나의 임베딩을 생성해 PostEmbedding 테이블에 저장(upsert)한다.
  // pgvector 컬럼은 Prisma가 직접 못 다루므로 raw SQL로 처리한다.
  // 게시글 작성 흐름을 막지 않도록 호출부에서 실패를 흡수한다.
  async upsertEmbedding(postId: string): Promise<void> {
    if (!this.openai.enabled) {
      return;
    }

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        tags: { include: { tag: true } },
        places: true,
      },
    });

    if (!post) {
      return;
    }

    const vector = await this.openai.embed(this.buildEmbedText(post));
    const literal = `[${vector.join(',')}]`;

    // 이미 임베딩 행이 있으면 갱신, 없으면 새로 만든다.
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "PostEmbedding" ("id", "postId", "embedding", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2::vector, NOW(), NOW())
       ON CONFLICT ("postId")
       DO UPDATE SET "embedding" = $2::vector, "updatedAt" = NOW()`,
      postId,
      literal,
    );
  }

  // 특정 게시글과 임베딩이 가장 가까운 다른 게시글들을 코사인 거리순으로 찾는다.
  async findSimilarToPost(postId: string, limit = 4): Promise<SimilarPost[]> {
    if (!this.openai.enabled) {
      return [];
    }

    // 기준 게시글의 임베딩을 직접 꺼내 비교 기준으로 쓴다.
    const rows = await this.prisma.$queryRawUnsafe<SimilarRow[]>(
      `SELECT p.id, p.title, p.city, p.content, p.duration, p."thumbnailUrl",
              u.name AS "authorName",
              1 - (pe.embedding <=> base.embedding) AS similarity
       FROM "PostEmbedding" pe
       JOIN "Post" p ON p.id = pe."postId"
       JOIN "User" u ON u.id = p."authorId"
       CROSS JOIN (SELECT embedding FROM "PostEmbedding" WHERE "postId" = $1) base
       WHERE pe."postId" != $1
         AND (1 - (pe.embedding <=> base.embedding)) >= $3
       ORDER BY pe.embedding <=> base.embedding
       LIMIT $2`,
      postId,
      limit,
      SIMILARITY_THRESHOLD,
    );

    return this.attachPlaces(rows.map(this.toSimilarPost));
  }

  // 자유 텍스트 질문을 임베딩해 의미가 가까운 코스들을 찾는다. (시맨틱 검색)
  async searchByQuery(query: string, limit = 4): Promise<SimilarPost[]> {
    const vectorResults: SimilarPost[] = [];

    if (this.openai.enabled) {
      try {
        const vector = await this.openai.embed(query);
        const literal = `[${vector.join(',')}]`;

        const rows = await this.prisma.$queryRawUnsafe<SimilarRow[]>(
          `SELECT p.id, p.title, p.city, p.content, p.duration, p."thumbnailUrl",
                  u.name AS "authorName",
                  1 - (pe.embedding <=> $1::vector) AS similarity
           FROM "PostEmbedding" pe
           JOIN "Post" p ON p.id = pe."postId"
           JOIN "User" u ON u.id = p."authorId"
           WHERE (1 - (pe.embedding <=> $1::vector)) >= $3
           ORDER BY pe.embedding <=> $1::vector
           LIMIT $2`,
          literal,
          limit,
          SIMILARITY_THRESHOLD,
        );

        vectorResults.push(...rows.map(this.toSimilarPost));
      } catch (err) {
        // 임베딩 API 장애가 나도 게시판 검색 자체가 완전히 죽지 않도록 키워드 fallback으로 넘긴다.
        this.logger.warn(
          `벡터 검색 실패, 키워드 검색으로 대체합니다: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    // 임베딩이 아직 생성되지 않았거나 검색 결과가 부족하면 DB 텍스트 검색으로 보완한다.
    const fallbackResults = await this.searchByKeywordFallback(
      query,
      limit - vectorResults.length,
      vectorResults.map((p) => p.id),
    );

    return this.attachPlaces(
      [...vectorResults, ...fallbackResults].slice(0, limit),
    );
  }

  // 게시판 Q&A: 질문과 의미가 가까운 코스 후기들을 컨텍스트로 모아 답변을 생성한다.
  async ask(
    question: string,
  ): Promise<{ answer: string; sources: SimilarPost[] }> {
    if (!this.openai.enabled) {
      throw new Error(
        'OPENAI_API_KEY가 설정되지 않아 Q&A 기능을 사용할 수 없습니다.',
      );
    }

    const sources = await this.searchByQuery(question, 4);

    if (sources.length === 0) {
      return {
        answer:
          '아직 참고할 만한 여행 코스 게시글이 없어요. 코스를 먼저 작성해 주세요.',
        sources: [],
      };
    }

    // 검색된 코스를 번호 매겨 컨텍스트로 넣는다. (출처 표시용)
    const context = sources
      .map(
        (s, i) =>
          `[${i + 1}] ${s.title} (${s.city}, 작성자 ${s.authorName})\n` +
          `${this.formatRoute(s.places)}\n${s.content}`,
      )
      .join('\n\n');

    const systemPrompt =
      '너는 국내 여행 코스 공유 게시판의 AI 도우미야. ' +
      '아래 제공된 게시글 후기들만 근거로 사용자 질문에 한국어로 친근하게 답해. ' +
      '후기에 없는 내용은 지어내지 말고, 모르면 모른다고 말해. ' +
      '답변에 참고한 코스는 [1], [2]처럼 번호로 표시해.';

    const userPrompt = `참고 게시글:\n${context}\n\n질문: ${question}`;

    const answer = await this.openai.chat(systemPrompt, userPrompt);
    return { answer, sources };
  }

  // raw SQL 결과 행을 API 응답 형태로 정리한다.
  private toSimilarPost = (row: SimilarRow): SimilarPost => ({
    id: row.id,
    title: row.title,
    city: row.city,
    content: row.content,
    duration: row.duration,
    thumbnailUrl: row.thumbnailUrl,
    authorName: row.authorName,
    places: [],
    similarity: Number(row.similarity),
  });

  // SimilarPost에 일차별 경유지 정보를 붙인다.
  private async attachPlaces(posts: SimilarPost[]): Promise<SimilarPost[]> {
    if (posts.length === 0) {
      return posts;
    }

    const places = await this.prisma.place.findMany({
      where: { postId: { in: posts.map((post) => post.id) } },
      orderBy: [{ day: 'asc' }, { order: 'asc' }],
      select: {
        postId: true,
        name: true,
        address: true,
        day: true,
        order: true,
      },
    });

    const byPostId = new Map<string, SimilarPostPlace[]>();
    for (const place of places) {
      byPostId.set(place.postId, [
        ...(byPostId.get(place.postId) ?? []),
        {
          name: place.name,
          address: place.address,
          day: place.day,
          order: place.order,
        },
      ]);
    }

    return posts.map((post) => ({
      ...post,
      places: byPostId.get(post.id) ?? [],
    }));
  }

  // 일차별 경유지를 LLM 컨텍스트에 넣기 좋은 짧은 문장으로 바꾼다.
  private formatRoute(places: SimilarPostPlace[]): string {
    if (places.length === 0) {
      return '코스 경유지: 등록된 경유지 없음';
    }

    const groups = new Map<number, string[]>();
    for (const place of places) {
      groups.set(place.day, [...(groups.get(place.day) ?? []), place.name]);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([day, names]) => `${day}일차: ${names.join(' → ')}`)
      .join('\n');
  }

  // 벡터 임베딩이 비어 있거나 부족할 때 도시·기간·태그·본문 키워드로 게시글을 찾는다.
  private async searchByKeywordFallback(
    query: string,
    limit: number,
    excludeIds: string[],
  ): Promise<SimilarPost[]> {
    if (limit <= 0) {
      return [];
    }

    const cityCandidates = this.extractCityCandidates(query);
    const duration = this.extractDurationDays(query);
    const keywords = this.extractKeywordCandidates(query);
    const or: Prisma.PostWhereInput[] = [];

    for (const city of cityCandidates) {
      or.push({ city: { contains: city } });
    }

    for (const keyword of keywords) {
      or.push({ title: { contains: keyword } });
      or.push({ content: { contains: keyword } });
      or.push({ tags: { some: { tag: { name: { contains: keyword } } } } });
    }

    if (duration) {
      or.push({ duration });
    }

    if (or.length === 0) {
      return [];
    }

    const posts = await this.prisma.post.findMany({
      where: {
        id: { notIn: excludeIds },
        OR: or,
      },
      // 먼저 넉넉히 가져온 뒤 점수화한다. 너무 적게 가져오면 오래된 정확한 코스가 후보에서 빠질 수 있다.
      take: Math.max(limit * 12, 80),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true } },
        tags: { include: { tag: true } },
      },
    });

    return posts
      .map((post) => ({
        post,
        score: this.scoreKeywordPost(post, cityCandidates, keywords, duration),
      }))
      .filter(({ score }) => score >= 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ post, score }) => ({
        id: post.id,
        title: post.title,
        city: post.city,
        content: post.content,
        duration: post.duration,
        thumbnailUrl: post.thumbnailUrl,
        authorName: post.author.name,
        places: [],
        similarity: score,
      }));
  }

  // "2박3일"은 실제 여행 일수 3일로 해석해서 duration 필드와 비교한다.
  private extractDurationDays(query: string): number | null {
    const nightsDays = query.match(/(\d+)\s*박\s*(\d+)\s*일/);
    if (nightsDays) {
      return Number(nightsDays[2]);
    }

    const days = query.match(/(\d+)\s*일/);
    return days ? Number(days[1]) : null;
  }

  // 사용자의 자연어 질문에서 DB city와 맞출 수 있는 도시 후보를 뽑는다.
  private extractCityCandidates(query: string): string[] {
    const candidates = new Set<string>();

    for (const [city, aliases] of Object.entries(CITY_ALIASES)) {
      if (aliases.some((alias) => query.includes(alias))) {
        candidates.add(city);
      }
    }

    return [...candidates];
  }

  // 질문에서 태그/제목/본문 검색에 쓸 핵심 키워드를 뽑는다.
  private extractKeywordCandidates(query: string): string[] {
    const keywords = new Set<string>();

    for (const keyword of TRAVEL_KEYWORDS) {
      if (query.includes(keyword)) {
        keywords.add(keyword);
      }
    }

    // 조사·동사까지 완벽히 분석하지는 않고, 초보 프로젝트에 맞게 긴 명사 후보만 보조로 사용한다.
    for (const token of query.match(/[가-힣A-Za-z]{2,}/g) ?? []) {
      if (
        ![
          '추천',
          '여행',
          '코스',
          '좋은',
          '가도',
          '가고',
          '있는',
          '있어',
          '해줘',
        ].includes(token)
      ) {
        keywords.add(token);
      }
    }

    return [...keywords].slice(0, 12);
  }

  // 키워드 fallback 결과를 질문과 얼마나 맞는지 대략 점수화한다.
  private scoreKeywordPost(
    post: KeywordPost,
    cityCandidates: string[],
    keywords: string[],
    duration: number | null,
  ): number {
    const searchableText = `${post.title}\n${post.content}`;
    const tagNames = post.tags.map((t) => t.tag.name);
    let score = 0.15;

    if (cityCandidates.includes(post.city)) {
      score += 0.3;
    }

    if (duration && post.duration) {
      score +=
        post.duration === duration
          ? 0.18
          : Math.abs(post.duration - duration) === 1
            ? 0.08
            : 0;
    }

    for (const keyword of keywords) {
      if (post.title.includes(keyword)) {
        score += 0.08;
      } else if (searchableText.includes(keyword)) {
        score += 0.04;
      }

      if (
        tagNames.some((tag) => tag.includes(keyword) || keyword.includes(tag))
      ) {
        score += 0.08;
      }
    }

    return Math.min(score, 0.82);
  }
}

// raw 쿼리가 돌려주는 행의 타입.
type SimilarRow = {
  id: string;
  title: string;
  city: string;
  content: string;
  duration: number | null;
  thumbnailUrl: string | null;
  authorName: string;
  similarity: number;
};

// Prisma include 결과 중 키워드 fallback 점수 계산에 필요한 필드만 표현한 타입.
type KeywordPost = {
  title: string;
  city: string;
  content: string;
  duration: number | null;
  tags: { tag: { name: string } }[];
};

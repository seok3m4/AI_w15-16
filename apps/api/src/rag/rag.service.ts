// 📌 RAG(검색 증강 생성) 핵심 로직.
// 게시글을 임베딩으로 저장하고, pgvector 코사인 거리로 유사 코스를 찾고,
// 검색된 코스를 컨텍스트로 넣어 게시판 Q&A 답변을 생성한다.
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  similarity: number; // 0~1, 1에 가까울수록 유사
};

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
    places: { name: string }[];
  }): string {
    const tagNames = post.tags.map((t) => t.tag.name).join(', ');
    const placeNames = post.places.map((p) => p.name).join(', ');
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
       ORDER BY pe.embedding <=> base.embedding
       LIMIT $2`,
      postId,
      limit,
    );

    return rows.map(this.toSimilarPost);
  }

  // 자유 텍스트 질문을 임베딩해 의미가 가까운 코스들을 찾는다. (시맨틱 검색)
  async searchByQuery(query: string, limit = 4): Promise<SimilarPost[]> {
    if (!this.openai.enabled) {
      return [];
    }

    const vector = await this.openai.embed(query);
    const literal = `[${vector.join(',')}]`;

    const rows = await this.prisma.$queryRawUnsafe<SimilarRow[]>(
      `SELECT p.id, p.title, p.city, p.content, p.duration, p."thumbnailUrl",
              u.name AS "authorName",
              1 - (pe.embedding <=> $1::vector) AS similarity
       FROM "PostEmbedding" pe
       JOIN "Post" p ON p.id = pe."postId"
       JOIN "User" u ON u.id = p."authorId"
       ORDER BY pe.embedding <=> $1::vector
       LIMIT $2`,
      literal,
      limit,
    );

    return rows.map(this.toSimilarPost);
  }

  // 게시판 Q&A: 질문과 의미가 가까운 코스 후기들을 컨텍스트로 모아 답변을 생성한다.
  async ask(question: string): Promise<{ answer: string; sources: SimilarPost[] }> {
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
          `[${i + 1}] ${s.title} (${s.city}, 작성자 ${s.authorName})\n${s.content}`,
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
    similarity: Number(row.similarity),
  });
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

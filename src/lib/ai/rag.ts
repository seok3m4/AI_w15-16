import { createHash } from "crypto";

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

import {
  getChatModel,
  getEmbeddingDimensions,
  getEmbeddingModel,
  getOpenAIApiKey,
  MAX_RAG_LIMIT,
} from "@/lib/ai/config";
import { stripPostImageMarkdown } from "@/lib/posts/content";
import { postSelect, toPostResponse } from "@/lib/posts/serializer";
import { prisma } from "@/lib/prisma";

type PostForEmbedding = {
  id: string;
  title: string;
  content: string;
  tags: {
    tag: {
      name: string;
    };
  }[];
};

type DraftForEmbedding = {
  title: string;
  content: string;
  tags: string[];
};

type SimilarPostRow = {
  postId: string;
  similarity: number;
};

type StoredEmbeddingRow = {
  contentHash: string;
  embedding: string;
};

export type SimilarPost = ReturnType<typeof toPostResponse> & {
  similarity: number;
};

export type DuplicateRisk = "none" | "low" | "medium" | "high";

type DuplicateCheckResult = {
  duplicateRisk: DuplicateRisk;
  duplicateWarning: string | null;
  topSimilarity: number | null;
};

export type SimilarPostsResult =
  | {
      ok: true;
      sourcePostId: string | null;
      summary: string | null;
      similarPosts: SimilarPost[];
      duplicateRisk: DuplicateRisk;
      duplicateWarning: string | null;
      topSimilarity: number | null;
    }
  | {
      ok: false;
      status: "not_found" | "disabled" | "unavailable";
      message: string;
    };

export type RelatedPostBundleSummaryResult =
  | {
      ok: true;
      title: string;
      summary: string;
      sources: SimilarPost[];
    }
  | {
      ok: false;
      status: "not_found" | "disabled" | "unavailable";
      message: string;
      sources: SimilarPost[];
    };

const postEmbeddingSelect = {
  id: true,
  title: true,
  content: true,
  tags: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      tag: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

function buildPostKnowledgeText(post: PostForEmbedding): string {
  const tags = post.tags.map(({ tag }) => tag.name).join(", ") || "태그 없음";

  return [
    `제목: ${post.title}`,
    `태그: ${tags}`,
    "본문:",
    stripPostImageMarkdown(post.content),
  ].join("\n");
}

function buildDraftKnowledgeText(draft: DraftForEmbedding): string {
  const tags = draft.tags.join(", ") || "태그 없음";

  return [
    `제목: ${draft.title}`,
    `태그: ${tags}`,
    "본문:",
    stripPostImageMarkdown(draft.content),
  ].join("\n");
}

function toPostLikeSource(draft: DraftForEmbedding): PostForEmbedding {
  return {
    id: "draft",
    title: draft.title,
    content: draft.content,
    tags: draft.tags.map((tag) => ({
      tag: {
        name: tag,
      },
    })),
  };
}

function createContentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function toVectorLiteral(embedding: number[]): string {
  const values = embedding.map((value) =>
    Number.isFinite(value) ? String(value) : "0",
  );

  return `[${values.join(",")}]`;
}

function getEmbeddingsClient(apiKey: string): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    apiKey,
    model: getEmbeddingModel(),
    dimensions: getEmbeddingDimensions(),
  });
}

async function findPostForEmbedding(
  postId: string,
): Promise<PostForEmbedding | null> {
  return prisma.post.findUnique({
    where: { id: postId },
    select: postEmbeddingSelect,
  });
}

async function findStoredEmbedding(
  postId: string,
): Promise<StoredEmbeddingRow | null> {
  const rows = await prisma.$queryRaw<StoredEmbeddingRow[]>`
    SELECT "contentHash", "embedding"::text AS "embedding"
    FROM "PostEmbedding"
    WHERE "postId" = ${postId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function upsertPostEmbedding(
  postId: string,
  contentHash: string,
  vectorLiteral: string,
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "PostEmbedding" ("postId", "contentHash", "embedding", "updatedAt")
    VALUES (${postId}, ${contentHash}, ${vectorLiteral}::vector, NOW())
    ON CONFLICT ("postId") DO UPDATE
    SET "contentHash" = EXCLUDED."contentHash",
        "embedding" = EXCLUDED."embedding",
        "updatedAt" = NOW()
  `;
}

async function getOrCreatePostEmbedding(postId: string): Promise<
  | {
      ok: true;
      post: PostForEmbedding;
      vectorLiteral: string;
    }
  | {
      ok: false;
      status: "not_found" | "disabled" | "unavailable";
      message: string;
    }
> {
  const post = await findPostForEmbedding(postId);

  if (!post) {
    return {
      ok: false,
      status: "not_found",
      message: "게시글을 찾을 수 없습니다.",
    };
  }

  const knowledgeText = buildPostKnowledgeText(post);
  const contentHash = createContentHash(knowledgeText);
  const storedEmbedding = await findStoredEmbedding(postId);

  if (storedEmbedding?.contentHash === contentHash) {
    return {
      ok: true,
      post,
      vectorLiteral: storedEmbedding.embedding,
    };
  }

  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return {
      ok: false,
      status: "disabled",
      message: "OPENAI_API_KEY가 설정되어 있지 않아 RAG 추천을 사용할 수 없습니다.",
    };
  }

  try {
    const embeddings = getEmbeddingsClient(apiKey);
    const embedding = await embeddings.embedQuery(knowledgeText);
    const vectorLiteral = toVectorLiteral(embedding);

    await upsertPostEmbedding(postId, contentHash, vectorLiteral);

    return {
      ok: true,
      post,
      vectorLiteral,
    };
  } catch (error) {
    console.error("Failed to refresh post embedding.", error);

    return {
      ok: false,
      status: "unavailable",
      message: "게시글 임베딩을 생성하지 못했습니다. pgvector 또는 OpenAI 설정을 확인해주세요.",
    };
  }
}

async function findSimilarPostRows(
  sourcePostId: string,
  vectorLiteral: string,
  limit: number,
): Promise<SimilarPostRow[]> {
  return prisma.$queryRaw<SimilarPostRow[]>`
    SELECT
      "postId",
      (1 - ("embedding" <=> ${vectorLiteral}::vector))::float AS "similarity"
    FROM "PostEmbedding"
    WHERE "postId" <> ${sourcePostId}
    ORDER BY "embedding" <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;
}

async function hydrateSimilarPosts(
  rows: SimilarPostRow[],
): Promise<SimilarPost[]> {
  const postIds = rows.map((row) => row.postId);

  if (postIds.length === 0) {
    return [];
  }

  const posts = await prisma.post.findMany({
    where: {
      id: {
        in: postIds,
      },
    },
    select: postSelect,
  });
  const postsById = new Map(posts.map((post) => [post.id, post]));

  return rows
    .map((row) => {
      const post = postsById.get(row.postId);

      if (!post) {
        return null;
      }

      return {
        ...toPostResponse(post),
        similarity: Number(row.similarity),
      };
    })
    .filter((post): post is SimilarPost => post !== null);
}

function getMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }

      return "";
    })
    .join("")
    .trim();
}

async function summarizeSimilarPosts(
  sourcePost: PostForEmbedding,
  similarPosts: SimilarPost[],
): Promise<string | null> {
  const apiKey = getOpenAIApiKey();

  if (!apiKey || similarPosts.length === 0) {
    return null;
  }

  const prompt = [
    "너는 야구 게시판의 RAG 추천 요약 도우미다.",
    "현재 게시글과 검색된 유사 게시글들의 공통 주제를 2~3문장으로 한국어 요약해라.",
    "과장하지 말고, 검색된 게시글 내용에 근거해서만 말해라.",
    "",
    "[현재 게시글]",
    `제목: ${sourcePost.title}`,
    `본문: ${stripPostImageMarkdown(sourcePost.content).slice(0, 1200)}`,
    "",
    "[유사 게시글]",
    ...similarPosts.map((post, index) =>
      [
        `${index + 1}. ${post.title}`,
        `태그: ${post.tags.map((tag) => tag.name).join(", ") || "없음"}`,
        `본문: ${stripPostImageMarkdown(post.content).slice(0, 700)}`,
      ].join("\n"),
    ),
  ].join("\n");

  try {
    const chat = new ChatOpenAI({
      apiKey,
      model: getChatModel(),
      temperature: 0.2,
    });
    const response = await chat.invoke(prompt);
    const summary = getMessageText(response.content);

    return summary || null;
  } catch (error) {
    console.error("Failed to summarize similar posts.", error);

    return null;
  }
}

function evaluateDuplicateRisk(
  similarPosts: SimilarPost[],
): DuplicateCheckResult {
  const topSimilarity = similarPosts[0]?.similarity ?? null;

  if (topSimilarity === null) {
    return {
      duplicateRisk: "none",
      duplicateWarning: null,
      topSimilarity,
    };
  }

  if (topSimilarity >= 0.86) {
    return {
      duplicateRisk: "high",
      duplicateWarning:
        "작성 중인 글과 매우 가까운 기존 게시글이 있습니다. 새 글로 등록하기 전에 이미 같은 내용이 논의됐는지 확인해보세요.",
      topSimilarity,
    };
  }

  if (topSimilarity >= 0.78) {
    return {
      duplicateRisk: "medium",
      duplicateWarning:
        "비슷한 주제의 게시글이 있습니다. 기존 글과 관점이나 정보가 어떻게 다른지 확인한 뒤 등록하는 것을 권장합니다.",
      topSimilarity,
    };
  }

  if (topSimilarity >= 0.68) {
    return {
      duplicateRisk: "low",
      duplicateWarning:
        "일부 내용이 비슷한 게시글이 있습니다. 참고하면 글의 방향을 더 분명히 잡을 수 있습니다.",
      topSimilarity,
    };
  }

  return {
    duplicateRisk: "none",
    duplicateWarning: null,
    topSimilarity,
  };
}

async function summarizeRelatedPostBundle(input: {
  title: string;
  description: string;
  posts: SimilarPost[];
}): Promise<string | null> {
  const apiKey = getOpenAIApiKey();

  if (!apiKey || input.posts.length === 0) {
    return null;
  }

  const prompt = [
    "너는 야구 커뮤니티의 경기방/팀 게시판 반응을 정리하는 RAG 요약 도우미다.",
    "아래 검색된 게시글들만 근거로 삼아 한국어로 요약해라.",
    "없는 사실을 만들지 말고, 경기 기록처럼 확정되지 않은 내용은 커뮤니티 의견이라고 표현해라.",
    "출력은 짧은 제목 1줄, 핵심 요약 2~3문장, 주요 쟁점 3개 bullet로 구성해라.",
    "",
    "[요약 대상]",
    `제목: ${input.title}`,
    `설명: ${input.description}`,
    "",
    "[검색된 게시글]",
    ...input.posts.map((post, index) =>
      [
        `${index + 1}. ${post.title}`,
        `태그: ${post.tags.map((tag) => tag.name).join(", ") || "없음"}`,
        `추천점수: ${post.counts.voteScore}, 댓글: ${post.counts.comments}, 조회: ${post.counts.views}`,
        `본문: ${stripPostImageMarkdown(post.content).slice(0, 900)}`,
      ].join("\n"),
    ),
  ].join("\n");

  try {
    const chat = new ChatOpenAI({
      apiKey,
      model: getChatModel(),
      temperature: 0.2,
    });
    const response = await chat.invoke(prompt);
    const summary = getMessageText(response.content);

    return summary || null;
  } catch (error) {
    console.error("Failed to summarize related post bundle.", error);

    return null;
  }
}

export async function refreshPostEmbedding(postId: string): Promise<void> {
  try {
    const result = await getOrCreatePostEmbedding(postId);

    if (!result.ok && result.status !== "disabled") {
      console.error(result.message);
    }
  } catch (error) {
    console.error("Post embedding refresh skipped.", error);
  }
}

export async function findSimilarPostsForPost(
  postId: string,
  limit: number,
): Promise<SimilarPostsResult> {
  try {
    const embedding = await getOrCreatePostEmbedding(postId);

    if (!embedding.ok) {
      return embedding;
    }

    const rows = await findSimilarPostRows(
      postId,
      embedding.vectorLiteral,
      limit,
    );
    const similarPosts = await hydrateSimilarPosts(rows);
    const summary = await summarizeSimilarPosts(embedding.post, similarPosts);
    const duplicateCheck = evaluateDuplicateRisk(similarPosts);

    return {
      ok: true,
      sourcePostId: postId,
      summary,
      similarPosts,
      ...duplicateCheck,
    };
  } catch (error) {
    console.error("Failed to find similar posts.", error);

    return {
      ok: false,
      status: "unavailable",
      message: "RAG 검색을 실행하지 못했습니다. pgvector 설정과 임베딩 테이블을 확인해주세요.",
    };
  }
}

export async function findSimilarPostsForDraft(input: {
  title: string;
  content: string;
  tags: string[];
  limit: number;
}): Promise<SimilarPostsResult> {
  const title = input.title.trim();
  const content = input.content.trim();
  const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);

  if (title.length < 2 || content.length < 10) {
    return {
      ok: false,
      status: "unavailable",
      message: "제목은 2자 이상, 본문은 10자 이상 입력해야 유사 게시글을 찾을 수 있습니다.",
    };
  }

  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return {
      ok: false,
      status: "disabled",
      message: "OPENAI_API_KEY가 설정되어 있지 않아 RAG 추천을 사용할 수 없습니다.",
    };
  }

  try {
    const draft = {
      title,
      content,
      tags,
    };
    const embeddings = getEmbeddingsClient(apiKey);
    const embedding = await embeddings.embedQuery(buildDraftKnowledgeText(draft));
    const vectorLiteral = toVectorLiteral(embedding);
    const rows = await findSimilarPostRows("draft", vectorLiteral, input.limit);
    const similarPosts = await hydrateSimilarPosts(rows);
    const summary = await summarizeSimilarPosts(
      toPostLikeSource(draft),
      similarPosts,
    );
    const duplicateCheck = evaluateDuplicateRisk(similarPosts);

    return {
      ok: true,
      sourcePostId: null,
      summary,
      similarPosts,
      ...duplicateCheck,
    };
  } catch (error) {
    console.error("Failed to find similar posts for draft.", error);

    return {
      ok: false,
      status: "unavailable",
      message: "초안 기반 RAG 검색을 실행하지 못했습니다. pgvector 또는 OpenAI 설정을 확인해주세요.",
    };
  }
}

export async function summarizeRelatedPostsByTags(input: {
  title: string;
  description: string;
  tags: string[];
  limit: number;
}): Promise<RelatedPostBundleSummaryResult> {
  const title = input.title.trim();
  const description = input.description.trim();
  const tags = input.tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, MAX_RAG_LIMIT);
  const limit = Math.min(Math.max(input.limit, 1), MAX_RAG_LIMIT);

  if (tags.length === 0) {
    return {
      ok: false,
      status: "not_found",
      message: "요약할 태그가 없습니다.",
      sources: [],
    };
  }

  const posts = await prisma.post.findMany({
    where: {
      OR: tags.map((tagName) => ({
        tags: {
          some: {
            tag: {
              name: {
                equals: tagName,
                mode: "insensitive",
              },
            },
          },
        },
      })),
    },
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: postSelect,
  });
  const sources = posts.map((post) => ({
    ...toPostResponse(post),
    similarity: 1,
  }));

  if (sources.length === 0) {
    return {
      ok: false,
      status: "not_found",
      message: "아직 요약할 관련 게시글이 없습니다.",
      sources,
    };
  }

  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return {
      ok: false,
      status: "disabled",
      message: "OPENAI_API_KEY가 설정되어 있지 않아 관련 글 요약을 사용할 수 없습니다.",
      sources,
    };
  }

  const summary = await summarizeRelatedPostBundle({
    title,
    description,
    posts: sources,
  });

  if (!summary) {
    return {
      ok: false,
      status: "unavailable",
      message: "관련 글 요약을 생성하지 못했습니다.",
      sources,
    };
  }

  return {
    ok: true,
    title,
    summary,
    sources,
  };
}

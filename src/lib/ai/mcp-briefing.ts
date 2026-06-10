import { ChatOpenAI } from "@langchain/openai";

import { getChatModel, getOpenAIApiKey } from "@/lib/ai/config";
import type {
  McpToolResult,
  NewsSearchResult,
  UrlBriefingResult,
} from "@/lib/mcp/baseball-briefing-tools";
import { invokeBaseballMcpTool } from "@/lib/mcp/json-rpc";

export type BriefingMode = "keyword" | "url";

type Source = {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string | null;
};

export type McpBriefingResult = {
  mode: BriefingMode;
  briefing: string;
  sources: Source[];
  toolName: "search_baseball_news" | "brief_external_url";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getMcpResult<TStructuredContent>(
  value: unknown,
): McpToolResult<TStructuredContent> {
  if (!isRecord(value) || !("structuredContent" in value)) {
    throw new Error("MCP response is invalid.");
  }

  return value as McpToolResult<TStructuredContent>;
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

function buildNewsSources(result: NewsSearchResult): Source[] {
  return result.articles.map((article) => ({
    title: article.title,
    url: article.url,
    source: article.source,
    publishedAt: article.publishedAt,
  }));
}

function buildUrlSources(result: UrlBriefingResult): Source[] {
  return [
    {
      title: result.title,
      url: result.url,
      source: "외부 URL",
      publishedAt: null,
    },
  ];
}

function buildFallbackBriefing(
  mode: BriefingMode,
  input: string,
  structuredContent: NewsSearchResult | UrlBriefingResult,
): string {
  if (mode === "keyword") {
    const result = structuredContent as NewsSearchResult;

    if (result.articles.length === 0) {
      return `"${input}"와 관련된 야구 뉴스를 찾지 못했습니다. 다른 팀명, 선수명, 이슈 키워드로 다시 검색해보세요.`;
    }

    return [
      `"${input}" 관련 야구 뉴스 ${result.articles.length}건을 찾았습니다.`,
      "게시글에는 기사 제목과 출처를 근거로 이슈 배경, 현재 흐름, 팬 관전 포인트를 나누어 정리하면 좋습니다.",
      `대표 기사: ${result.articles[0].title}`,
    ].join("\n");
  }

  const result = structuredContent as UrlBriefingResult;

  return [
    `외부 URL "${result.title}" 내용을 확인했습니다.`,
    result.description || "페이지 설명 정보는 제공되지 않았습니다.",
    "게시글에는 링크의 핵심 주장, 야구 이슈와의 관련성, 개인 의견을 구분해 작성하면 좋습니다.",
  ].join("\n");
}

async function generateBriefingWithLlm(
  mode: BriefingMode,
  input: string,
  structuredContent: NewsSearchResult | UrlBriefingResult,
): Promise<string | null> {
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return null;
  }

  const prompt = [
    "너는 야구 게시판의 MCP 브리핑 작성 도우미다.",
    "외부 MCP 도구가 가져온 자료만 근거로 한국어 브리핑을 작성해라.",
    "추측하지 말고, 기사 링크나 URL에서 확인 가능한 내용 중심으로 말해라.",
    "출력 형식: 핵심 요약 3줄, 게시글 초안 2문장, 추천 태그 3~5개.",
    "",
    `[입력 유형] ${mode}`,
    `[사용자 입력] ${input}`,
    "[MCP 도구 결과]",
    JSON.stringify(structuredContent, null, 2),
  ].join("\n");

  try {
    const chat = new ChatOpenAI({
      apiKey,
      model: getChatModel(),
      temperature: 0.2,
    });
    const response = await chat.invoke(prompt);

    return getMessageText(response.content) || null;
  } catch (error) {
    console.error("Failed to generate MCP briefing with LLM.", error);

    return null;
  }
}

export async function createMcpBriefing(
  mode: BriefingMode,
  input: string,
): Promise<McpBriefingResult> {
  const toolName =
    mode === "keyword" ? "search_baseball_news" : "brief_external_url";
  const toolArgs =
    mode === "keyword" ? { keyword: input } : { url: input };
  const toolResult = await invokeBaseballMcpTool(toolName, toolArgs);

  if (mode === "keyword") {
    const result = getMcpResult<NewsSearchResult>(toolResult).structuredContent;
    const llmBriefing = await generateBriefingWithLlm(mode, input, result);

    return {
      mode,
      toolName,
      briefing: llmBriefing ?? buildFallbackBriefing(mode, input, result),
      sources: buildNewsSources(result),
    };
  }

  const result = getMcpResult<UrlBriefingResult>(toolResult).structuredContent;
  const llmBriefing = await generateBriefingWithLlm(mode, input, result);

  return {
    mode,
    toolName,
    briefing: llmBriefing ?? buildFallbackBriefing(mode, input, result),
    sources: buildUrlSources(result),
  };
}

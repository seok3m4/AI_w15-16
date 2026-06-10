import { isIP } from "net";

type ToolContent = {
  type: "text";
  text: string;
};

export type McpToolResult<TStructuredContent> = {
  content: ToolContent[];
  structuredContent: TStructuredContent;
};

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type NewsArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
};

export type NewsSearchResult = {
  query: string;
  articles: NewsArticle[];
};

export type UrlBriefingResult = {
  url: string;
  title: string;
  description: string;
  excerpt: string;
};

const NEWS_LIMIT = 5;
const MAX_KEYWORD_LENGTH = 80;
const MAX_URL_BYTES = 400_000;
const GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search";

const tools: ToolDefinition[] = [
  {
    name: "search_baseball_news",
    description:
      "Search recent Korean baseball news from an external RSS source by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "야구 뉴스 검색 키워드",
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "brief_external_url",
    description:
      "Fetch a public external URL and extract title, description, and readable excerpt.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "분석할 외부 뉴스 또는 참고 URL",
        },
      },
      required: ["url"],
    },
  },
];

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractXmlTag(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));

  return match ? decodeXml(stripHtml(match[1])) : "";
}

function parseRssItems(xml: string): NewsArticle[] {
  return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)]
    .slice(0, NEWS_LIMIT)
    .map((match) => {
      const item = match[0];
      const title = extractXmlTag(item, "title");
      const url = extractXmlTag(item, "link");
      const source = extractXmlTag(item, "source") || "Google News";
      const publishedAt = extractXmlTag(item, "pubDate") || null;

      return {
        title,
        url,
        source,
        publishedAt,
      };
    })
    .filter((article) => article.title && article.url);
}

function normalizeKeyword(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("keyword must be a string.");
  }

  const keyword = value.trim();

  if (keyword.length < 2 || keyword.length > MAX_KEYWORD_LENGTH) {
    throw new Error(`keyword must be between 2 and ${MAX_KEYWORD_LENGTH} characters.`);
  }

  return keyword;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    first === 0
  );
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const ipVersion = isIP(normalized);

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  if (ipVersion === 4) {
    return isPrivateIpv4(normalized);
  }

  if (ipVersion === 6) {
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80")
    );
  }

  return false;
}

function normalizePublicUrl(value: unknown): URL {
  if (typeof value !== "string") {
    throw new Error("url must be a string.");
  }

  const url = new URL(value.trim());

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new Error("Private or local URLs are not allowed.");
  }

  return url;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "BaseballAIBoard/0.1 MCP briefing crawler",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`External request failed with status ${response.status}.`);
  }

  const contentLength = Number(response.headers.get("content-length"));

  if (contentLength > MAX_URL_BYTES) {
    throw new Error("External response is too large.");
  }

  const reader = response.body?.getReader();

  if (!reader) {
    return response.text();
  }

  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    receivedBytes += value.byteLength;

    if (receivedBytes > MAX_URL_BYTES) {
      throw new Error("External response is too large.");
    }

    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

function extractMetaContent(html: string, selector: RegExp): string {
  const match = html.match(selector);

  return match ? stripHtml(decodeXml(match[1])) : "";
}

function extractHtmlBrief(url: string, html: string): UrlBriefingResult {
  const title =
    extractMetaContent(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    extractMetaContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
    url;
  const description =
    extractMetaContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    extractMetaContent(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const bodyText = stripHtml(html).slice(0, 1200);

  return {
    url,
    title,
    description,
    excerpt: bodyText,
  };
}

export function listBaseballBriefingTools(): ToolDefinition[] {
  return tools;
}

export async function searchBaseballNews(
  args: Record<string, unknown>,
): Promise<McpToolResult<NewsSearchResult>> {
  const keyword = normalizeKeyword(args.keyword);
  const rssUrl = new URL(GOOGLE_NEWS_RSS_URL);

  rssUrl.searchParams.set("q", `${keyword} 야구 OR KBO`);
  rssUrl.searchParams.set("hl", "ko");
  rssUrl.searchParams.set("gl", "KR");
  rssUrl.searchParams.set("ceid", "KR:ko");

  const xml = await fetchText(rssUrl.toString());
  const articles = parseRssItems(xml);
  const text =
    articles.length > 0
      ? articles
          .map(
            (article, index) =>
              `${index + 1}. ${article.title} (${article.source})\n${article.url}`,
          )
          .join("\n")
      : "검색된 야구 뉴스가 없습니다.";

  return {
    content: [{ type: "text", text }],
    structuredContent: {
      query: keyword,
      articles,
    },
  };
}

export async function briefExternalUrl(
  args: Record<string, unknown>,
): Promise<McpToolResult<UrlBriefingResult>> {
  const url = normalizePublicUrl(args.url);
  const html = await fetchText(url.toString());
  const result = extractHtmlBrief(url.toString(), html);

  return {
    content: [
      {
        type: "text",
        text: [result.title, result.description, result.excerpt]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    structuredContent: result,
  };
}

export async function callBaseballBriefingTool(
  name: string,
  args: Record<string, unknown>,
) {
  if (name === "search_baseball_news") {
    return searchBaseballNews(args);
  }

  if (name === "brief_external_url") {
    return briefExternalUrl(args);
  }

  throw new Error(`Unknown MCP tool: ${name}`);
}

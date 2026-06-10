export type KboNewsArticle = {
  id: string;
  title: string;
  url: string;
  summary: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string | null;
};

export type KboNewsResult = {
  source: string;
  fetchedAt: string;
  articles: KboNewsArticle[];
};

const KBO_BASE_URL = "https://www.koreabaseball.com";
export const KBO_NEWS_LIST_URL = `${KBO_BASE_URL}/MediaNews/News/BreakingNews/List.aspx`;

const NEWS_CACHE_TTL_MS = 60_000;
const MAX_NEWS_LIMIT = 30;

let kboNewsCache:
  | {
      expiresAt: number;
      result: KboNewsResult;
    }
  | null = null;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .trim();
}

function stripHtml(value: string): string {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveKboUrl(value: string): string {
  const decodedValue = decodeHtml(value);

  if (decodedValue.startsWith("//")) {
    return `https:${decodedValue}`;
  }

  return new URL(decodedValue, KBO_NEWS_LIST_URL).toString();
}

function getBoundedLimit(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value <= 0) {
    return 20;
  }

  return Math.min(value, MAX_NEWS_LIMIT);
}

function extractPublishedAt(itemHtml: string): string | null {
  const text = stripHtml(itemHtml);
  const match = text.match(/20\d{2}[.-]\d{1,2}[.-]\d{1,2}/);

  return match ? match[0].replace(/\./g, "-") : null;
}

function extractArticleId(url: string): string {
  try {
    const parsedUrl = new URL(url);

    return parsedUrl.searchParams.get("bdSe") ?? url;
  } catch {
    return url;
  }
}

function parseKboNewsArticles(html: string): KboNewsArticle[] {
  const listMatch = html.match(
    /<ul[^>]*class=["'][^"']*boardPhoto[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i,
  );

  if (!listMatch) {
    return [];
  }

  return [...listMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => match[1])
    .map((itemHtml) => {
      const titleLinkMatch =
        itemHtml.match(
          /<strong[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/strong>/i,
        ) ??
        itemHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const summaryMatch = itemHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const imageMatch = itemHtml.match(/<img[^>]+src=["']([^"']+)["']/i);

      if (!titleLinkMatch) {
        return null;
      }

      const url = resolveKboUrl(titleLinkMatch[1]);
      const title = stripHtml(titleLinkMatch[2]);
      const summary = summaryMatch ? stripHtml(summaryMatch[1]) : "";
      const imageUrl = imageMatch ? resolveKboUrl(imageMatch[1]) : null;

      if (!title || !url) {
        return null;
      }

      return {
        id: extractArticleId(url),
        title,
        url,
        summary,
        imageUrl,
        source: "KBO",
        publishedAt: extractPublishedAt(itemHtml),
      };
    })
    .filter((article): article is KboNewsArticle => article !== null)
    .slice(0, MAX_NEWS_LIMIT);
}

async function fetchKboNewsHtml(): Promise<string> {
  const response = await fetch(KBO_NEWS_LIST_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: KBO_BASE_URL,
      "User-Agent": "BaseballAIBoard/0.1 KBO official news reader",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`KBO news request failed with status ${response.status}.`);
  }

  return response.text();
}

export async function fetchKboNews(options?: {
  limit?: number;
  forceRefresh?: boolean;
}): Promise<KboNewsResult> {
  const limit = getBoundedLimit(options?.limit);

  if (
    !options?.forceRefresh &&
    kboNewsCache &&
    kboNewsCache.expiresAt > Date.now()
  ) {
    return {
      ...kboNewsCache.result,
      articles: kboNewsCache.result.articles.slice(0, limit),
    };
  }

  const html = await fetchKboNewsHtml();
  const result: KboNewsResult = {
    source: KBO_NEWS_LIST_URL,
    fetchedAt: new Date().toISOString(),
    articles: parseKboNewsArticles(html),
  };

  kboNewsCache = {
    expiresAt: Date.now() + NEWS_CACHE_TTL_MS,
    result,
  };

  return {
    ...result,
    articles: result.articles.slice(0, limit),
  };
}

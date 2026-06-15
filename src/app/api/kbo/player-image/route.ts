const ALLOWED_IMAGE_HOSTS = new Set([
  "sports-phinf.pstatic.net",
  "ssl.pstatic.net",
]);

function getImageUrl(value: string | null): URL | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(url.hostname)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = getImageUrl(searchParams.get("url"));

  if (!imageUrl) {
    return new Response("Invalid player image URL.", { status: 400 });
  }

  const response = await fetch(imageUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      Referer: "https://m.sports.naver.com/",
      "User-Agent": "BaseballAIBoard/0.1 player image proxy",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok || !response.body) {
    return new Response("Player image not found.", { status: 404 });
  }

  return new Response(response.body, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Type": response.headers.get("Content-Type") ?? "image/png",
    },
  });
}

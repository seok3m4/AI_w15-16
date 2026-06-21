import { MobilePostCreateForm } from "@/components/mobile-app/mobile-post-create-form";

type MobileWritePageProps = {
  searchParams: Promise<{
    title?: string | string[];
    content?: string | string[];
    tags?: string | string[];
    source?: string | string[];
    text?: string | string[];
    url?: string | string[];
  }>;
};

function getFirstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tagName) => tagName.trim())
    .filter(Boolean);
}

function createSharedTitle({
  title,
  text,
  url,
}: {
  title: string;
  text: string;
  url: string;
}): string {
  if (title.trim()) {
    return title.trim();
  }

  if (url.trim()) {
    return "공유한 야구 링크";
  }

  return text.trim().split(/\r?\n/)[0]?.slice(0, 80) || "공유한 야구 이야기";
}

function createSharedContent({
  content,
  source,
  text,
  title,
  url,
}: {
  content: string;
  source: string;
  text: string;
  title: string;
  url: string;
}): string {
  if (content.trim()) {
    return content;
  }

  if (source !== "web-share") {
    return "";
  }

  return [
    title.trim() ? `공유 제목: ${title.trim()}` : "",
    text.trim() ? `공유 내용:\n${text.trim().slice(0, 1_500)}` : "",
    url.trim() ? `공유 링크: ${url.trim()}` : "",
    "",
    "PWA 공유 대상으로 받은 내용을 바탕으로 작성했습니다.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export const metadata = {
  title: "앱 글쓰기 | KBO Fan Hub",
};

export default async function MobileWritePage({
  searchParams,
}: MobileWritePageProps) {
  const { title, content, tags, source, text, url } = await searchParams;
  const initialSource = getFirstParam(source);
  const sharedTitle = getFirstParam(title);
  const sharedText = getFirstParam(text);
  const sharedUrl = getFirstParam(url);

  return (
    <MobilePostCreateForm
      initialContent={createSharedContent({
        content: getFirstParam(content),
        source: initialSource,
        text: sharedText,
        title: sharedTitle,
        url: sharedUrl,
      })}
      initialSource={initialSource}
      initialTags={parseTags(getFirstParam(tags))}
      initialTitle={createSharedTitle({
        title: sharedTitle,
        text: sharedText,
        url: sharedUrl,
      })}
    />
  );
}

import { PostCreateForm } from "@/components/posts/post-create-form";
import { SiteHeader } from "@/components/site-header";

type NewPostPageProps = {
  searchParams: Promise<{
    title?: string | string[];
    content?: string | string[];
    tags?: string | string[];
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

export default async function NewPostPage({
  searchParams,
}: NewPostPageProps) {
  const { title, content, tags } = await searchParams;

  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <PostCreateForm
        initialContent={getFirstParam(content)}
        initialTags={parseTags(getFirstParam(tags))}
        initialTitle={getFirstParam(title)}
      />
    </main>
  );
}

import { PostDetail } from "@/components/posts/post-detail";
import { SiteHeader } from "@/components/site-header";

type PostDetailPageProps = {
  params: Promise<{
    postId: string;
  }>;
  searchParams: Promise<{
    revision?: string | string[];
  }>;
};

function getRevision(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function PostDetailPage({
  params,
  searchParams,
}: PostDetailPageProps) {
  const { postId } = await params;
  const { revision } = await searchParams;

  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <PostDetail postId={postId} revision={getRevision(revision)} />
    </main>
  );
}

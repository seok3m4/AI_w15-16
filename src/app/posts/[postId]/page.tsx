import { PostDetail } from "@/components/posts/post-detail";
import { SiteHeader } from "@/components/site-header";

type PostDetailPageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { postId } = await params;

  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <PostDetail postId={postId} />
    </main>
  );
}

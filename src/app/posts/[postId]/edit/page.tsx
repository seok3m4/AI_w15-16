import { PostEditForm } from "@/components/posts/post-edit-form";
import { SiteHeader } from "@/components/site-header";

type PostEditPageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export default async function PostEditPage({ params }: PostEditPageProps) {
  const { postId } = await params;

  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <PostEditForm postId={postId} />
    </main>
  );
}

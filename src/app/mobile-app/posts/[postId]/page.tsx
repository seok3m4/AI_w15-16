import { MobilePostDetail } from "@/components/mobile-app/mobile-post-detail";

type MobilePostDetailPageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export const metadata = {
  title: "게시글 | KBO Fan Hub",
};

export default async function MobilePostDetailPage({
  params,
}: MobilePostDetailPageProps) {
  const { postId } = await params;

  return <MobilePostDetail postId={postId} />;
}

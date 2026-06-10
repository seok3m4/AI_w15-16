import { PostCreateForm } from "@/components/posts/post-create-form";
import { SiteHeader } from "@/components/site-header";

export default function NewPostPage() {
  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <PostCreateForm />
    </main>
  );
}


import { PostCreateForm } from "@/components/posts/post-create-form";
import { SiteHeader } from "@/components/site-header";

export default function NewPostPage() {
  return (
    <main className="min-h-screen bg-[#f7f9fb] text-[#172033]">
      <SiteHeader />
      <PostCreateForm />
    </main>
  );
}

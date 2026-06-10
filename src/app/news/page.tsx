import { KboNewsPage } from "@/components/news/kbo-news-page";
import { SiteHeader } from "@/components/site-header";

export default function NewsPage() {
  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <KboNewsPage />
    </main>
  );
}


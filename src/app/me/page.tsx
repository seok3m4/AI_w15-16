import { MyPage } from "@/components/me/my-page";
import { SiteHeader } from "@/components/site-header";

export default function MePage() {
  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <MyPage />
    </main>
  );
}

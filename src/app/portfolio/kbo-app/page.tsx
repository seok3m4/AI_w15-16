import { KboAppImprovementPage } from "@/components/portfolio/kbo-app-improvement-page";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "KBO 앱 개선안 | KBO Talk",
};

export default function PortfolioKboAppPage() {
  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <KboAppImprovementPage />
    </main>
  );
}

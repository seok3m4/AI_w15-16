import { BoardHome } from "@/components/board/board-home";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f9fb] text-[#172033]">
      <SiteHeader />
      <BoardHome />
    </main>
  );
}

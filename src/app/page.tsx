import { BoardHome } from "@/components/board/board-home";
import { SiteHeader } from "@/components/site-header";

type HomeProps = {
  searchParams: Promise<{
    tag?: string | string[];
  }>;
};

function getInitialTags(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values
    .flatMap((tagName) => tagName.split(","))
    .map((tagName) => tagName.trim())
    .filter(Boolean);
}

export default async function Home({ searchParams }: HomeProps) {
  const { tag } = await searchParams;

  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <BoardHome initialTags={getInitialTags(tag)} />
    </main>
  );
}

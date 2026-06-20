import { BoardHome } from "@/components/board/board-home";
import { SiteHeader } from "@/components/site-header";
import { KBO_TEAMS } from "@/lib/kbo/game";

type HomeProps = {
  searchParams: Promise<{
    tag?: string | string[];
    team?: string | string[];
  }>;
};

function getInitialTags(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values
    .flatMap((tagName) => tagName.split(","))
    .map((tagName) => tagName.trim())
    .filter(Boolean);
}

function getInitialTeam(value: string | string[] | undefined): string {
  const teamName = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

  if (!teamName) {
    return "";
  }

  return (
    KBO_TEAMS.find(
      (candidate) => candidate.toLowerCase() === teamName.toLowerCase(),
    ) ?? ""
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const { tag, team } = await searchParams;

  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <BoardHome
        initialTags={getInitialTags(tag)}
        initialTeam={getInitialTeam(team)}
      />
    </main>
  );
}

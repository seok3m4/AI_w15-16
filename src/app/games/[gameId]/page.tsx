import { GameRoom } from "@/components/games/game-room";
import { SiteHeader } from "@/components/site-header";
import { getTodayInputValue } from "@/lib/kbo/game";

type GameRoomPageProps = {
  params: Promise<{
    gameId: string;
  }>;
  searchParams: Promise<{
    date?: string | string[];
  }>;
};

function getFirstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function GameRoomPage({
  params,
  searchParams,
}: GameRoomPageProps) {
  const { gameId } = await params;
  const { date } = await searchParams;

  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <GameRoom
        gameKey={gameId}
        initialDate={getFirstParam(date) || getTodayInputValue()}
      />
    </main>
  );
}

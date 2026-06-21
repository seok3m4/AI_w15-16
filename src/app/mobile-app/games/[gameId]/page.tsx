import { MobileGameRoom } from "@/components/mobile-app/mobile-game-room";
import { getTodayInputValue } from "@/lib/kbo/game";

type MobileGameRoomPageProps = {
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

export const metadata = {
  title: "앱 경기방 | KBO Fan Hub",
};

export default async function MobileGameRoomPage({
  params,
  searchParams,
}: MobileGameRoomPageProps) {
  const { gameId } = await params;
  const { date } = await searchParams;

  return (
    <MobileGameRoom
      gameKey={gameId}
      initialDate={getFirstParam(date) || getTodayInputValue()}
    />
  );
}

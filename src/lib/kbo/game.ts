export type KboGameStatus = "scheduled" | "live" | "completed" | "draw";

export type KboPitcher = {
  id: string | null;
  name: string;
};

export type KboStartingPitcher = KboPitcher;

export type KboLiveState = {
  inning: number | null;
  inningHalf: string;
  balls: number | null;
  strikes: number | null;
  outs: number | null;
  firstBaseOccupied: boolean;
  secondBaseOccupied: boolean;
  thirdBaseOccupied: boolean;
  awayCurrentPlayer: KboPitcher | null;
  homeCurrentPlayer: KboPitcher | null;
};

export type KboGame = {
  gameDate: string;
  displayDate: string;
  time: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
  status: KboGameStatus;
  stadium: string;
  tv: string;
  note: string;
  gameId: string | null;
  awayStartingPitcher: KboStartingPitcher | null;
  homeStartingPitcher: KboStartingPitcher | null;
  winningPitcher: KboPitcher | null;
  losingPitcher: KboPitcher | null;
  savePitcher: KboPitcher | null;
  liveState: KboLiveState | null;
  reviewUrl: string | null;
  highlightUrl: string | null;
};

export const KBO_TEAMS = [
  "LG",
  "한화",
  "SSG",
  "삼성",
  "NC",
  "KT",
  "롯데",
  "KIA",
  "두산",
  "키움",
];

export function getTodayInputValue(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getGameKey(game: KboGame): string {
  return (
    game.gameId ??
    `${game.gameDate}-${game.awayTeam}-${game.homeTeam}`
      .replace(/\s+/g, "-")
      .toLowerCase()
  );
}

export function getStatusLabel(status: KboGameStatus): string {
  if (status === "scheduled") {
    return "예정";
  }

  if (status === "live") {
    return "진행중";
  }

  if (status === "draw") {
    return "무승부";
  }

  return "종료";
}

export function getScoreText(game: KboGame): string {
  if (game.awayScore === null || game.homeScore === null) {
    return "경기 전";
  }

  return `${game.awayScore} : ${game.homeScore}`;
}

export function getWinnerTeam(game: KboGame): string | null {
  if (game.status === "scheduled" || game.status === "live") {
    return null;
  }

  if (game.awayScore === null || game.homeScore === null) {
    return null;
  }

  if (game.awayScore === game.homeScore) {
    return null;
  }

  return game.awayScore > game.homeScore ? game.awayTeam : game.homeTeam;
}

export function getGameRoomHref(game: KboGame): string {
  const params = new URLSearchParams({
    date: game.gameDate,
  });

  return `/games/${encodeURIComponent(getGameKey(game))}?${params.toString()}`;
}

export function getMobileGameRoomHref(game: KboGame): string {
  const params = new URLSearchParams({
    date: game.gameDate,
  });

  return `/mobile-app/games/${encodeURIComponent(getGameKey(game))}?${params.toString()}`;
}

export function getReviewTitle(game: KboGame): string {
  return `${game.gameDate} ${game.awayTeam} VS ${game.homeTeam} 리뷰`;
}

export function getReviewTags(game: KboGame): string[] {
  return ["KBO", "경기리뷰", game.awayTeam, game.homeTeam];
}

export function getReviewDraftTemplate(game: KboGame): string {
  const scoreText = getScoreText(game);
  const winnerTeam = getWinnerTeam(game);
  const resultLine =
    winnerTeam === null
      ? `${game.awayTeam}와 ${game.homeTeam}의 경기는 ${scoreText}로 마무리됐다.`
      : `${winnerTeam}가 ${scoreText}로 승리했다.`;

  return [
    `${game.displayDate || game.gameDate} ${game.awayTeam} vs ${game.homeTeam} 경기 리뷰`,
    "",
    resultLine,
    game.stadium ? `장소는 ${game.stadium}이었다.` : "",
    "",
    "경기 흐름",
    "- ",
    "",
    "결정적인 장면",
    "- ",
    "",
    "투수/타자 포인트",
    "- ",
    "",
    "아쉬웠던 장면",
    "- ",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function getWriteReviewHref(game: KboGame): string {
  const params = new URLSearchParams({
    title: getReviewTitle(game),
    tags: getReviewTags(game).join(", "),
    content: getReviewDraftTemplate(game),
  });

  return `/posts/new?${params.toString()}`;
}

export function getMobileWriteReviewHref(game: KboGame): string {
  const params = new URLSearchParams({
    title: getReviewTitle(game),
    tags: getReviewTags(game).join(", "),
    content: getReviewDraftTemplate(game),
  });

  return `/mobile-app/write?${params.toString()}`;
}

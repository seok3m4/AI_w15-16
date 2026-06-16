"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { GamePredictionPanel } from "@/components/ai/game-prediction-panel";
import { KboRecordBriefingPanel } from "@/components/ai/kbo-record-briefing-panel";
import { RelatedPostSummaryPanel } from "@/components/ai/related-post-summary-panel";
import { KboLineupPanel } from "@/components/games/kbo-lineup-panel";
import { LiveGamecastPanel } from "@/components/games/live-gamecast-panel";
import {
  type KboGame,
  getGameKey,
  getGameRoomHref,
  getReviewTags,
  getScoreText,
  getStatusLabel,
  getTodayInputValue,
  getWinnerTeam,
  getWriteReviewHref,
} from "@/lib/kbo/game";

type KboGamesResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: {
    date: string;
    team: string | null;
    source: string;
    games: KboGame[];
  };
};

type Post = {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    email: string;
    nickname: string;
  };
  tags: {
    id: string;
    name: string;
  }[];
  createdAt: string;
  counts: {
    comments: number;
    tags: number;
  };
};

type PostsResponse = {
  posts?: Post[];
  message?: string;
};

type GameRoomProps = {
  gameKey: string;
  initialDate: string;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPitcherName(pitcher: KboGame["awayStartingPitcher"]): string {
  return pitcher?.name || "미정";
}

function getStartingPitcherText(game: KboGame): string {
  return [
    game.awayStartingPitcher
      ? `${game.awayTeam} ${game.awayStartingPitcher.name}`
      : "",
    game.homeStartingPitcher
      ? `${game.homeTeam} ${game.homeStartingPitcher.name}`
      : "",
  ]
    .filter(Boolean)
    .join(" vs ");
}

function canPredictGame(game: KboGame): boolean {
  return game.status === "scheduled" || game.status === "live";
}

export function GameRoom({ gameKey, initialDate }: GameRoomProps) {
  const decodedGameKey = safeDecode(gameKey);
  const [date, setDate] = useState(initialDate || getTodayInputValue());
  const [gamesData, setGamesData] = useState<KboGamesResponse | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [relatedMessage, setRelatedMessage] = useState("");
  const [isGamesLoading, setIsGamesLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);

  const game = useMemo(() => {
    return gamesData?.result?.games.find((candidate) => {
      const candidateKey = getGameKey(candidate);

      return candidateKey === decodedGameKey || candidate.gameId === decodedGameKey;
    });
  }, [decodedGameKey, gamesData]);

  useEffect(() => {
    let isMounted = true;

    async function loadGames(silent = false) {
      if (!silent) {
        setIsGamesLoading(true);
        setGamesData(null);
      }

      try {
        const params = new URLSearchParams({ date });
        const response = await fetch(`/api/ai/mcp/kbo-games?${params}`, {
          cache: "no-store",
          credentials: "include",
        });
        const responseData = (await response.json()) as KboGamesResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setGamesData({
            status: "unavailable",
            message:
              responseData.message ?? "경기 데이터를 불러오지 못했습니다.",
          });
          return;
        }

        setGamesData(responseData);
      } catch {
        if (isMounted) {
          setGamesData({
            status: "unavailable",
            message: "네트워크 연결을 확인해주세요.",
          });
        }
      } finally {
        if (isMounted && !silent) {
          setIsGamesLoading(false);
        }
      }
    }

    void loadGames();
    const shouldPollLiveScores = date === getTodayInputValue();
    const intervalId = shouldPollLiveScores
      ? window.setInterval(() => void loadGames(true), 15_000)
      : null;

    return () => {
      isMounted = false;

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [date]);

  useEffect(() => {
    if (!game) {
      return;
    }

    const selectedGame = game;
    let isMounted = true;

    async function loadRelatedPosts() {
      setIsPostsLoading(true);
      setRelatedMessage("");

      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "6",
        });

        [selectedGame.awayTeam, selectedGame.homeTeam].forEach((tagName) => {
          params.append("tag", tagName);
        });

        const response = await fetch(`/api/posts?${params}`, {
          cache: "no-store",
          credentials: "include",
        });
        const responseData = (await response.json()) as PostsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !responseData.posts) {
          setRelatedPosts([]);
          setRelatedMessage(
            responseData.message ?? "관련 글을 불러오지 못했습니다.",
          );
          return;
        }

        setRelatedPosts(responseData.posts);
      } catch {
        if (isMounted) {
          setRelatedPosts([]);
          setRelatedMessage("관련 글을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsPostsLoading(false);
        }
      }
    }

    void loadRelatedPosts();

    return () => {
      isMounted = false;
    };
  }, [game]);

  if (isGamesLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-sm border border-[#b9c3d7] bg-white px-4 py-8 text-center text-sm text-[#667085]">
          경기방을 불러오는 중입니다.
        </div>
      </section>
    );
  }

  const gamesForSelectedDate = gamesData?.result?.games ?? [];

  if (gamesData?.message || !game) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-sm border border-[#b9c3d7] bg-white p-5">
          <h1 className="text-xl font-black text-[#1f3470]">
            {gamesData?.message
              ? "경기 데이터를 불러오지 못했습니다."
              : "선택한 날짜의 경기방을 선택해주세요."}
          </h1>
          <p className="mt-2 text-sm text-[#667085]">
            {gamesData?.message ??
              (gamesForSelectedDate.length > 0
                ? "현재 보고 있던 경기는 선택한 날짜에 없습니다. 아래 경기 중 하나를 선택하면 해당 경기방으로 이동합니다."
                : "선택한 날짜의 경기 일정이 없습니다. 날짜를 다시 선택하거나 홈으로 돌아가세요.")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              className="h-9 rounded-sm border border-[#c8d3df] bg-white px-2 text-sm outline-none focus:border-[#2f4f9f]"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
            <Link
              className="inline-flex h-9 items-center rounded-sm bg-[#2f4f9f] px-3 text-sm font-bold text-white hover:bg-[#1f3470]"
              href="/"
            >
              홈으로
            </Link>
          </div>

          {gamesForSelectedDate.length > 0 ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {gamesForSelectedDate.map((candidate) => (
                <Link
                  className="block rounded-sm border border-[#d8deea] bg-[#fbfcff] p-3 hover:border-[#2f4f9f] hover:bg-white"
                  href={getGameRoomHref(candidate)}
                  key={getGameKey(candidate)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black text-[#202632]">
                      {candidate.awayTeam} VS {candidate.homeTeam}
                    </p>
                    <span className="shrink-0 rounded-sm bg-[#fff1f2] px-2 py-1 text-xs font-black text-[#d71920]">
                      {getStatusLabel(candidate.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-black text-[#1f3470]">
                    {getScoreText(candidate)}
                  </p>
                  <p className="mt-1 text-xs text-[#667085]">
                    {[candidate.time || "시간 미정", candidate.stadium]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {getStartingPitcherText(candidate) ? (
                    <p className="mt-1 truncate text-xs font-bold text-[#202632]">
                      선발 {getStartingPitcherText(candidate)}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  const winnerTeam = getWinnerTeam(game);
  const resultText =
    game.status === "live"
      ? "경기 진행 중"
      : winnerTeam
        ? `${winnerTeam} 승`
        : game.status === "draw"
          ? "무승부"
          : "승패 미정";
  const gameNote = game.note.trim();
  const shouldShowGameNote = Boolean(gameNote && gameNote !== "-");
  const summaryTags = [game.awayTeam, game.homeTeam];
  const summaryTitle = `${game.gameDate} ${game.awayTeam} VS ${game.homeTeam} 관련 글`;
  const summaryDescription = [
    `${game.awayTeam}와 ${game.homeTeam} 경기방`,
    `스코어: ${getScoreText(game)}`,
    game.stadium ? `구장: ${game.stadium}` : "",
    winnerTeam ? `결과: ${winnerTeam} 승` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="mx-auto max-w-6xl px-4 py-5">
      <div className="overflow-hidden rounded-sm border border-[#b9c3d7] bg-white">
        <div className="border-b border-[#d8deea] bg-[#f6f8fc] px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black text-[#d71920]">
                {game.displayDate || game.gameDate} · {game.stadium || "경기장 미정"}
              </p>
              <h1 className="mt-1 text-2xl font-black text-[#1f3470]">
                {game.awayTeam} VS {game.homeTeam}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="h-9 rounded-sm border border-[#c8d3df] bg-white px-2 text-sm outline-none focus:border-[#2f4f9f]"
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
              <Link
                className="inline-flex h-9 items-center rounded-sm bg-[#2f4f9f] px-3 text-sm font-black text-white hover:bg-[#1f3470]"
                href={getWriteReviewHref(game)}
              >
                경기 리뷰 쓰기
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-4">
            <div className="grid rounded-sm border border-[#d8deea] bg-white sm:grid-cols-[1fr_160px_1fr]">
              <div className="px-4 py-5 text-center">
                <p className="text-xl font-black text-[#1f3470]">
                  {game.awayTeam}
                </p>
                <p className="mt-1 text-xs font-bold text-[#667085]">
                  선발 {getPitcherName(game.awayStartingPitcher)}
                </p>
                <p className="mt-2 text-4xl font-black text-[#202632]">
                  {game.awayScore ?? "-"}
                </p>
              </div>
              <div className="border-y border-[#d8deea] bg-[#f6f8fc] px-4 py-5 text-center sm:border-x sm:border-y-0">
                <span className="rounded-sm bg-[#fff1f2] px-2 py-1 text-xs font-black text-[#d71920]">
                  {getStatusLabel(game.status)}
                </span>
                <p className="mt-3 text-sm font-black text-[#1f3470]">
                  {getScoreText(game)}
                </p>
                <p className="mt-1 text-xs text-[#667085]">
                  {game.time || "시간 미정"}
                </p>
              </div>
              <div className="px-4 py-5 text-center">
                <p className="text-xl font-black text-[#1f3470]">
                  {game.homeTeam}
                </p>
                <p className="mt-1 text-xs font-bold text-[#667085]">
                  선발 {getPitcherName(game.homeStartingPitcher)}
                </p>
                <p className="mt-2 text-4xl font-black text-[#202632]">
                  {game.homeScore ?? "-"}
                </p>
              </div>
            </div>

            <div
              className={[
                "mt-3 grid gap-3",
                shouldShowGameNote ? "md:grid-cols-3" : "md:grid-cols-2",
              ].join(" ")}
            >
              <div className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-3">
                <p className="text-xs font-bold text-[#667085]">결과</p>
                <p className="mt-1 text-sm font-black text-[#202632]">
                  {resultText}
                </p>
              </div>
              <div className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-3">
                <p className="text-xs font-bold text-[#667085]">중계</p>
                <p className="mt-1 text-sm font-black text-[#202632]">
                  {game.tv || "정보 없음"}
                </p>
              </div>
              {shouldShowGameNote ? (
                <div className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-3">
                  <p className="text-xs font-bold text-[#667085]">비고</p>
                  <p className="mt-1 text-sm font-black text-[#202632]">
                    {gameNote}
                  </p>
                </div>
              ) : null}
            </div>

            <LiveGamecastPanel game={game} />

            <KboLineupPanel game={game} />

            {canPredictGame(game) ? <GamePredictionPanel game={game} /> : null}

            <KboRecordBriefingPanel game={game} />

            <section className="mt-4 rounded-sm border border-[#b9c3d7] bg-white">
              <div className="border-b border-[#d8deea] bg-[#f6f8fc] px-3 py-2">
                <h2 className="text-sm font-black text-[#1f3470]">
                  이 경기 관련 글
                </h2>
              </div>
              <RelatedPostSummaryPanel
                description={summaryDescription}
                tags={summaryTags}
                title={summaryTitle}
              />
              {isPostsLoading ? (
                <p className="px-3 py-5 text-sm text-[#667085]">
                  관련 글을 불러오는 중입니다.
                </p>
              ) : null}
              {!isPostsLoading && relatedMessage ? (
                <p className="px-3 py-5 text-sm text-[#b91c1c]">
                  {relatedMessage}
                </p>
              ) : null}
              {!isPostsLoading && !relatedMessage && relatedPosts.length === 0 ? (
                <p className="px-3 py-5 text-sm text-[#667085]">
                  아직 이 경기와 연결된 글이 없습니다.
                </p>
              ) : null}
              {!isPostsLoading && relatedPosts.length > 0 ? (
                <div className="divide-y divide-[#edf1f7]">
                  {relatedPosts.map((post) => (
                    <Link
                      className="block px-3 py-3 hover:bg-[#f8fafc]"
                      href={`/posts/${post.id}`}
                      key={post.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-bold text-[#202632]">
                          {post.title}
                        </p>
                        <span className="shrink-0 text-xs font-black text-[#d71920]">
                          [{post.counts.comments}]
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#667085]">
                        {post.author.nickname} · {formatDateTime(post.createdAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          <aside className="border-t border-[#d8deea] bg-[#fbfcff] p-4 lg:border-l lg:border-t-0">
            <section className="rounded-sm border border-[#d8deea] bg-white p-3">
              <h2 className="text-sm font-black text-[#1f3470]">공식 기록</h2>
              <div className="mt-3 grid gap-2">
                {game.reviewUrl ? (
                  <a
                    className="rounded-sm border border-[#b9c3d7] bg-white px-3 py-2 text-sm font-bold text-[#1f3470] hover:bg-[#eef3ff]"
                    href={game.reviewUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    KBO 리뷰 보기
                  </a>
                ) : null}
                {game.highlightUrl ? (
                  <a
                    className="rounded-sm border border-[#b9c3d7] bg-white px-3 py-2 text-sm font-bold text-[#1f3470] hover:bg-[#eef3ff]"
                    href={game.highlightUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    하이라이트 보기
                  </a>
                ) : null}
                {gamesData?.result?.source ? (
                  <a
                    className="rounded-sm border border-[#b9c3d7] bg-white px-3 py-2 text-sm font-bold text-[#1f3470] hover:bg-[#eef3ff]"
                    href={gamesData.result.source}
                    rel="noreferrer"
                    target="_blank"
                  >
                    일정 원문 보기
                  </a>
                ) : null}
              </div>
            </section>

            <section className="mt-3 rounded-sm border border-[#d8deea] bg-white p-3">
              <h2 className="text-sm font-black text-[#1f3470]">태그</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {getReviewTags(game).map((tagName) => (
                  <Link
                    className="rounded-sm bg-[#eef3ff] px-2 py-1 text-xs font-black text-[#2f4f9f] hover:bg-[#d8e5ff]"
                    href={`/?tag=${encodeURIComponent(tagName)}`}
                    key={tagName}
                  >
                    #{tagName}
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

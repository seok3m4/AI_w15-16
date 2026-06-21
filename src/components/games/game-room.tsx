"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { GamePredictionPanel } from "@/components/ai/game-prediction-panel";
import { KboRecordBriefingPanel } from "@/components/ai/kbo-record-briefing-panel";
import { RelatedPostSummaryPanel } from "@/components/ai/related-post-summary-panel";
import { KboBoxscorePanel } from "@/components/games/kbo-boxscore-panel";
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

function getDecisionPitcherText(game: KboGame): string {
  if (game.status === "scheduled" || game.status === "live") {
    return "";
  }

  return [
    game.winningPitcher ? `승 ${game.winningPitcher.name}` : "",
    game.losingPitcher ? `패 ${game.losingPitcher.name}` : "",
    game.savePitcher ? `세 ${game.savePitcher.name}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function canPredictGame(game: KboGame): boolean {
  return game.status === "scheduled" || game.status === "live";
}

function getPhaseCopy(game: KboGame, resultText: string) {
  if (game.status === "scheduled") {
    return {
      title: "경기 전",
      description: "선발투수, 라인업, 경기 전망을 먼저 확인해보세요.",
    };
  }

  if (game.status === "live") {
    return {
      title: "경기 중",
      description: "스코어와 문자중계를 보면서 경기 흐름을 따라갈 수 있습니다.",
    };
  }

  return {
    title: resultText,
    description: "박스스코어, 선수 기록, 관련 글을 보며 경기를 복기해보세요.",
  };
}

function getFocusItems(game: KboGame): string[] {
  if (game.status === "scheduled") {
    return ["선발투수 확인", "라인업 공개 여부 확인", "경기 전망 보기"];
  }

  if (game.status === "live") {
    return ["문자중계 확인", "현재 스코어 확인", "관련 글 흐름 보기"];
  }

  return ["박스스코어 확인", "타자/투수 기록 보기", "경기 리뷰 작성"];
}

function SectionIntro({
  description,
  id,
  title,
}: {
  description: string;
  id: string;
  title: string;
}) {
  return (
    <div className="scroll-mt-28" id={id}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[#1f3470]">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[#667085]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
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
      <section className="page-shell pt-5">
        <div className="community-panel px-4 py-8 text-center text-sm text-[#667085]">
          경기방을 불러오는 중입니다.
        </div>
      </section>
    );
  }

  const gamesForSelectedDate = gamesData?.result?.games ?? [];

  if (gamesData?.message || !game) {
    return (
      <section className="page-shell pt-5">
        <div className="community-panel p-5">
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
              className="community-input text-sm"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
            <Link
              className="community-button-primary px-3 text-sm"
              href="/"
            >
              홈으로
            </Link>
          </div>

          {gamesForSelectedDate.length > 0 ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {gamesForSelectedDate.map((candidate) => (
                <Link
                  className="community-subpanel block bg-[#fbfcff] p-3 hover:border-[#2f4f9f] hover:bg-white"
                  href={getGameRoomHref(candidate)}
                  key={getGameKey(candidate)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black text-[#202632]">
                      {candidate.awayTeam} VS {candidate.homeTeam}
                    </p>
                    <span className="community-chip community-chip-accent shrink-0 px-2">
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
  const otherGames = gamesForSelectedDate.filter((candidate) => {
    const candidateKey = getGameKey(candidate);

    return candidateKey !== getGameKey(game) && candidate.gameId !== game.gameId;
  });
  const startingPitcherText = getStartingPitcherText(game);
  const decisionPitcherText = getDecisionPitcherText(game);
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
  const phaseCopy = getPhaseCopy(game, resultText);
  const focusItems = getFocusItems(game);
  const roomNavItems = [
    {
      href: "#game-live",
      label: game.status === "scheduled" ? "경기 전" : "중계",
      description: game.status === "scheduled" ? "시작 전 정보" : "문자중계",
    },
    {
      href: "#game-lineup",
      label: "라인업",
      description: canPredictGame(game) ? "전망 포함" : "출전 선수",
    },
    {
      href: "#game-records",
      label: "기록",
      description: "박스스코어",
    },
    {
      href: "#game-community",
      label: "관련 글",
      description: "요약과 글 목록",
    },
  ];

  return (
    <section className="page-shell pt-5">
      <div className="community-panel overflow-hidden">
        <div className="border-b border-[#d8deea] bg-[#fbfcff] px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black text-[#d71920]">
                {game.displayDate || game.gameDate} ·{" "}
                {game.stadium || "경기장 미정"}
              </p>
              <h1 className="mt-1 text-2xl font-black text-[#1f3470]">
                {game.awayTeam} VS {game.homeTeam}
              </h1>
              <p className="mt-2 text-sm font-bold text-[#667085]">
                {phaseCopy.title} · {getScoreText(game)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="community-input text-sm"
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
              <Link
                className="community-button-secondary px-3 text-sm"
                href="/"
              >
                홈으로
              </Link>
              <Link
                className="community-button-primary px-3 text-sm"
                href={getWriteReviewHref(game)}
              >
                리뷰 쓰기
              </Link>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid overflow-hidden rounded-sm border border-[#d8deea] bg-white md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)]">
            <div className="px-4 py-5 text-center md:text-left">
              <p className="text-sm font-black text-[#667085]">원정</p>
              <p className="mt-1 text-2xl font-black text-[#1f3470]">
                {game.awayTeam}
              </p>
              <p className="mt-2 text-xs font-bold text-[#667085]">
                선발 {getPitcherName(game.awayStartingPitcher)}
              </p>
              <p className="mt-3 text-5xl font-black text-[#202632]">
                {game.awayScore ?? "-"}
              </p>
            </div>

            <div className="border-y border-[#d8deea] bg-[#f6f8fc] px-4 py-5 text-center md:border-x md:border-y-0">
              <span className="community-chip community-chip-accent px-2">
                {getStatusLabel(game.status)}
              </span>
              <p className="mt-3 text-lg font-black text-[#1f3470]">
                {getScoreText(game)}
              </p>
              <p className="mt-1 text-xs font-bold text-[#667085]">
                {game.time || "시간 미정"}
              </p>
              <p className="mt-4 text-xs leading-5 text-[#667085]">
                {phaseCopy.description}
              </p>
            </div>

            <div className="px-4 py-5 text-center md:text-right">
              <p className="text-sm font-black text-[#667085]">홈</p>
              <p className="mt-1 text-2xl font-black text-[#1f3470]">
                {game.homeTeam}
              </p>
              <p className="mt-2 text-xs font-bold text-[#667085]">
                선발 {getPitcherName(game.homeStartingPitcher)}
              </p>
              <p className="mt-3 text-5xl font-black text-[#202632]">
                {game.homeScore ?? "-"}
              </p>
            </div>
          </div>
        </div>

        <nav className="sticky top-16 z-20 border-y border-[#d8deea] bg-white/95 px-3 py-2 backdrop-blur">
          <div className="grid grid-cols-4 gap-2">
            {roomNavItems.map((item) => (
              <a
                className="rounded-sm border border-[#d8deea] bg-[#fbfcff] px-2 py-2 text-center hover:border-[#2f4f9f] hover:bg-white"
                href={item.href}
                key={item.href}
              >
                <span className="block text-xs font-black text-[#1f3470]">
                  {item.label}
                </span>
                <span className="mt-0.5 hidden text-[11px] font-bold text-[#667085] sm:block">
                  {item.description}
                </span>
              </a>
            ))}
          </div>
        </nav>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="community-subpanel bg-[#fbfcff] p-3">
                <p className="text-xs font-bold text-[#667085]">지금 상황</p>
                <p className="mt-1 text-sm font-black text-[#202632]">
                  {resultText}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#667085]">
                  {game.time || "시간 미정"} · {game.stadium || "구장 미정"}
                </p>
              </div>
              <div className="community-subpanel bg-[#fbfcff] p-3">
                <p className="text-xs font-bold text-[#667085]">투수 흐름</p>
                <p className="mt-1 text-sm font-black leading-6 text-[#202632]">
                  {startingPitcherText || "선발 정보 미정"}
                </p>
                {decisionPitcherText ? (
                  <p className="mt-2 text-xs font-bold leading-5 text-[#d71920]">
                    {decisionPitcherText}
                  </p>
                ) : null}
              </div>
              <div className="community-subpanel bg-[#fbfcff] p-3">
                <p className="text-xs font-bold text-[#667085]">중계</p>
                <p className="mt-1 text-sm font-black text-[#202632]">
                  {game.tv || "정보 없음"}
                </p>
              </div>
              <div className="community-subpanel bg-[#fbfcff] p-3">
                <p className="text-xs font-bold text-[#667085]">구장</p>
                <p className="mt-1 text-sm font-black leading-6 text-[#202632]">
                  {game.stadium || "정보 없음"}
                </p>
              </div>
              {shouldShowGameNote ? (
                <div className="community-subpanel bg-[#fbfcff] p-3">
                  <p className="text-xs font-bold text-[#667085]">비고</p>
                  <p className="mt-1 text-sm font-black text-[#202632]">
                    {gameNote}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="scroll-mt-28" id="game-live">
              <SectionIntro
                description={
                  game.status === "scheduled"
                    ? "경기 전에는 시작 시간과 중계 정보를 확인하고, 진행 중에는 문자중계를 볼 수 있습니다."
                    : "경기 흐름과 회차별 문자중계를 확인합니다."
                }
                id="game-live-title"
                title={game.status === "scheduled" ? "경기 전 정보" : "실시간 중계"}
              />
              <LiveGamecastPanel game={game} />
            </div>

            <div className="scroll-mt-28" id="game-lineup">
              <SectionIntro
                description="공식 라인업과 선발 정보를 보고, 경기 전에는 관전 포인트를 정리합니다."
                id="game-lineup-title"
                title="라인업과 전망"
              />
              <KboLineupPanel game={game} />
              {canPredictGame(game) ? <GamePredictionPanel game={game} /> : null}
            </div>

            <div className="scroll-mt-28" id="game-records">
              <SectionIntro
                description="이닝별 점수, 타자 기록, 투수 기록, 공식 기록 포인트를 한 번에 확인합니다."
                id="game-records-title"
                title="경기 기록"
              />
              <KboBoxscorePanel game={game} />
              <KboRecordBriefingPanel game={game} />
            </div>

            <section className="community-panel mt-4 scroll-mt-28" id="game-community">
              <div className="community-panel-header">
                <div>
                  <h2 className="text-sm font-black text-[#1f3470]">
                    이 경기 관련 글
                  </h2>
                  <p className="mt-1 text-xs text-[#667085]">
                    같은 팀 태그가 달린 글과 경기방 요약
                  </p>
                </div>
                <Link
                  className="community-button-secondary community-button-compact"
                  href={getWriteReviewHref(game)}
                >
                  리뷰 쓰기
                </Link>
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

          <aside className="border-t border-[#d8deea] bg-[#fbfcff] p-4 lg:sticky lg:top-28 lg:self-start lg:border-l lg:border-t-0">
            <section className="community-subpanel bg-white p-3">
              <h2 className="text-sm font-black text-[#1f3470]">
                먼저 보면 좋은 것
              </h2>
              <ol className="mt-3 grid gap-2">
                {focusItems.map((item, index) => (
                  <li
                    className="flex items-center gap-2 text-sm font-bold text-[#202632]"
                    key={item}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[#1f3470] text-[11px] font-black text-white">
                      {index + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </section>

            <section className="community-subpanel mt-3 bg-white p-3">
              <h2 className="text-sm font-black text-[#1f3470]">경기 정보</h2>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-xs font-bold text-[#667085]">상태</dt>
                  <dd className="text-right font-black text-[#202632]">
                    {getStatusLabel(game.status)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-xs font-bold text-[#667085]">시간</dt>
                  <dd className="text-right font-black text-[#202632]">
                    {game.time || "시간 미정"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-xs font-bold text-[#667085]">구장</dt>
                  <dd className="text-right font-black text-[#202632]">
                    {game.stadium || "정보 없음"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-xs font-bold text-[#667085]">선발</dt>
                  <dd className="text-right font-black leading-5 text-[#202632]">
                    {startingPitcherText || "미정"}
                  </dd>
                </div>
                {decisionPitcherText ? (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-xs font-bold text-[#667085]">결정</dt>
                    <dd className="text-right font-black leading-5 text-[#202632]">
                      {decisionPitcherText}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="community-subpanel mt-3 bg-white p-3">
              <h2 className="text-sm font-black text-[#1f3470]">공식 기록</h2>
              <div className="mt-3 grid gap-2">
                {game.reviewUrl ? (
                  <a
                    className="community-link-button"
                    href={game.reviewUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    KBO 리뷰 보기
                  </a>
                ) : null}
                {game.highlightUrl ? (
                  <a
                    className="community-link-button"
                    href={game.highlightUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    하이라이트 보기
                  </a>
                ) : null}
                {gamesData?.result?.source ? (
                  <a
                    className="community-link-button"
                    href={gamesData.result.source}
                    rel="noreferrer"
                    target="_blank"
                  >
                    일정 원문 보기
                  </a>
                ) : null}
              </div>
            </section>

            {otherGames.length > 0 ? (
              <section className="community-subpanel mt-3 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-black text-[#1f3470]">
                    같은 날짜 다른 경기
                  </h2>
                  <span className="community-chip px-2">
                    {otherGames.length}경기
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {otherGames.map((candidate) => (
                    <Link
                      className="community-subpanel bg-[#fbfcff] px-3 py-2 hover:border-[#2f4f9f] hover:bg-white"
                      href={getGameRoomHref(candidate)}
                      key={getGameKey(candidate)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black text-[#202632]">
                          {candidate.awayTeam} VS {candidate.homeTeam}
                        </p>
                        <span className="shrink-0 text-xs font-black text-[#d71920]">
                          {getScoreText(candidate)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#667085]">
                        {[getStatusLabel(candidate.status), candidate.stadium]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="community-subpanel mt-3 bg-white p-3">
              <h2 className="text-sm font-black text-[#1f3470]">태그</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {getReviewTags(game).map((tagName) => (
                  <Link
                    className="community-chip community-chip-link px-2"
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

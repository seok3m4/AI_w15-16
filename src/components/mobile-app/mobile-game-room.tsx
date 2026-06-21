"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RelatedPostSummaryPanel } from "@/components/ai/related-post-summary-panel";
import { KboBoxscorePanel } from "@/components/games/kbo-boxscore-panel";
import { KboLineupPanel } from "@/components/games/kbo-lineup-panel";
import { LiveGamecastPanel } from "@/components/games/live-gamecast-panel";
import { MobileShareButton } from "@/components/mobile-app/mobile-share-button";
import { OpenWebButton } from "@/components/mobile-app/open-web-button";
import {
  type KboGame,
  getGameKey,
  getGameRoomHref,
  getMobileGameRoomHref,
  getScoreText,
  getStatusLabel,
  getTodayInputValue,
  getWinnerTeam,
  getMobileWriteReviewHref,
} from "@/lib/kbo/game";

type MobileGameTab = "summary" | "relay" | "records" | "community";

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

type RelatedPost = {
  id: string;
  title: string;
  author: {
    nickname: string;
  };
  createdAt: string;
  counts: {
    comments: number;
    views: number;
    voteScore: number;
  };
};

type PostsResponse = {
  posts?: RelatedPost[];
  message?: string;
};

type MobileGameRoomProps = {
  gameKey: string;
  initialDate: string;
};

const tabs: Array<{ id: MobileGameTab; label: string }> = [
  { id: "summary", label: "요약" },
  { id: "relay", label: "중계" },
  { id: "records", label: "기록" },
  { id: "community", label: "글" },
];

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

function getResultText(game: KboGame): string {
  const winnerTeam = getWinnerTeam(game);

  if (game.status === "live") {
    return "경기 진행 중";
  }

  if (winnerTeam) {
    return `${winnerTeam} 승`;
  }

  if (game.status === "draw") {
    return "무승부";
  }

  return "승패 미정";
}

function MobileSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[18px] border border-white/70 bg-white p-4 shadow-sm">
      <h2 className="text-base font-black text-[#071a3d]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RelatedPostCard({ post }: { post: RelatedPost }) {
  return (
    <Link
      className="block rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-3"
      href={`/posts/${post.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm font-black leading-5 text-[#202632]">
          {post.title}
        </p>
        <span className="shrink-0 text-xs font-black text-[#d71920]">
          [{post.counts.comments}]
        </span>
      </div>
      <p className="mt-2 text-xs font-bold text-[#667085]">
        {post.author.nickname} · {formatDateTime(post.createdAt)}
      </p>
      <p className="mt-1 text-xs text-[#667085]">
        조회 {post.counts.views} · 추천 {post.counts.voteScore}
      </p>
    </Link>
  );
}

export function MobileGameRoom({
  gameKey,
  initialDate,
}: MobileGameRoomProps) {
  const decodedGameKey = safeDecode(gameKey);
  const [date, setDate] = useState(initialDate || getTodayInputValue());
  const [selectedTab, setSelectedTab] = useState<MobileGameTab>("summary");
  const [gamesData, setGamesData] = useState<KboGamesResponse | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);

  const game = useMemo(() => {
    return gamesData?.result?.games.find((candidate) => {
      const candidateKey = getGameKey(candidate);

      return candidateKey === decodedGameKey || candidate.gameId === decodedGameKey;
    });
  }, [decodedGameKey, gamesData]);

  const gamesForSelectedDate = gamesData?.result?.games ?? [];

  useEffect(() => {
    let isMounted = true;

    async function loadGames() {
      setIsLoading(true);
      setMessage("");

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
          setGamesData(null);
          setMessage(responseData.message ?? "경기 정보를 불러오지 못했습니다.");
          return;
        }

        setGamesData(responseData);
      } catch {
        if (isMounted) {
          setGamesData(null);
          setMessage("네트워크 연결을 확인해주세요.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadGames();

    return () => {
      isMounted = false;
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

      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "5",
        });

        [selectedGame.awayTeam, selectedGame.homeTeam].forEach((tagName) => {
          params.append("tag", tagName);
        });

        const response = await fetch(`/api/posts?${params}`, {
          cache: "no-store",
          credentials: "include",
        });
        const responseData = (await response.json()) as PostsResponse;

        if (isMounted) {
          setRelatedPosts(response.ok ? responseData.posts ?? [] : []);
        }
      } catch {
        if (isMounted) {
          setRelatedPosts([]);
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

  if (isLoading) {
    return (
      <section className="min-h-screen bg-[#dfe7f3] px-4 py-8 text-[#101827]">
        <div className="mx-auto max-w-md rounded-[24px] bg-white p-5 text-sm font-bold text-[#667085] shadow-sm">
          앱 경기방을 불러오는 중입니다.
        </div>
      </section>
    );
  }

  if (!game) {
    return (
      <section className="min-h-screen bg-[#dfe7f3] px-4 py-6 text-[#101827]">
        <div className="mx-auto max-w-md space-y-3">
          <Link
            className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-black text-[#071a3d]"
            href="/mobile-app"
          >
            앱 홈
          </Link>
          <MobileSection title="경기 정보를 찾지 못했습니다">
            <p className="text-sm leading-6 text-[#667085]">
              {message ||
                "날짜를 바꾸거나 아래 경기 중 하나를 선택해주세요."}
            </p>
            <input
              className="community-input mt-3 w-full text-sm"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
            {gamesForSelectedDate.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {gamesForSelectedDate.map((candidate) => (
                  <Link
                    className="rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-3"
                    href={getMobileGameRoomHref(candidate)}
                    key={getGameKey(candidate)}
                  >
                    <p className="text-sm font-black text-[#071a3d]">
                      {candidate.awayTeam} VS {candidate.homeTeam}
                    </p>
                    <p className="mt-1 text-xs text-[#667085]">
                      {candidate.time || "시간 미정"} · {getScoreText(candidate)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : null}
          </MobileSection>
        </div>
      </section>
    );
  }

  const resultText = getResultText(game);
  const decisionPitcherText = getDecisionPitcherText(game);
  const summaryTitle = `${game.gameDate} ${game.awayTeam} VS ${game.homeTeam} 관련 글`;
  const summaryDescription = [
    `${game.awayTeam}와 ${game.homeTeam} 앱 경기방`,
    `스코어: ${getScoreText(game)}`,
    game.stadium ? `구장: ${game.stadium}` : "",
    `상태: ${getStatusLabel(game.status)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="min-h-screen bg-[#dfe7f3] text-[#101827]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#f3f6fb] shadow-2xl md:my-6 md:min-h-[860px] md:overflow-hidden md:rounded-[32px] md:border md:border-white">
        <header className="bg-[#071a3d] px-5 pb-5 pt-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white"
              href="/mobile-app"
            >
              앱 홈
            </Link>
            <input
              className="h-9 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-bold text-white outline-none"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs font-black text-white/55">
              {game.displayDate || game.gameDate} · {game.stadium || "구장 미정"}
            </p>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <p className="truncate text-lg font-black">{game.awayTeam}</p>
                <p className="mt-1 text-xs text-white/60">
                  선발 {getPitcherName(game.awayStartingPitcher)}
                </p>
              </div>
              <div className="rounded-3xl bg-white px-4 py-3 text-[#071a3d]">
                <p className="text-xs font-black text-[#d71920]">
                  {getStatusLabel(game.status)}
                </p>
                <p className="mt-1 text-xl font-black">{getScoreText(game)}</p>
              </div>
              <div>
                <p className="truncate text-lg font-black">{game.homeTeam}</p>
                <p className="mt-1 text-xs text-white/60">
                  선발 {getPitcherName(game.homeStartingPitcher)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm font-bold text-white/75">
              {resultText} · {game.time || "시간 미정"}
            </p>
          </div>
        </header>

        <nav className="grid grid-cols-4 gap-1 border-b border-[#d8deea] bg-white px-3 py-2">
          {tabs.map((tab) => (
            <button
              className={[
                "rounded-2xl px-2 py-2 text-xs font-black",
                selectedTab === tab.id
                  ? "bg-[#071a3d] text-white"
                  : "text-[#667085]",
              ].join(" ")}
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8">
          {selectedTab === "summary" ? (
            <div className="space-y-3">
              <MobileSection title="경기 요약">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-[#fbfcff] p-3">
                    <p className="text-[11px] font-black text-[#667085]">
                      선발
                    </p>
                    <p className="mt-1 text-sm font-black leading-5 text-[#071a3d]">
                      {getStartingPitcherText(game) || "미정"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fbfcff] p-3">
                    <p className="text-[11px] font-black text-[#667085]">
                      중계
                    </p>
                    <p className="mt-1 text-sm font-black leading-5 text-[#071a3d]">
                      {game.tv || "정보 없음"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fbfcff] p-3">
                    <p className="text-[11px] font-black text-[#667085]">
                      결정
                    </p>
                    <p className="mt-1 text-sm font-black leading-5 text-[#d71920]">
                      {decisionPitcherText || "경기 후 표시"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fbfcff] p-3">
                    <p className="text-[11px] font-black text-[#667085]">
                      구장
                    </p>
                    <p className="mt-1 text-sm font-black leading-5 text-[#071a3d]">
                      {game.stadium || "정보 없음"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  <Link
                    className="community-button-primary w-full"
                    href={getMobileWriteReviewHref(game)}
                  >
                    경기 리뷰 쓰기
                  </Link>
                  <OpenWebButton
                    className="community-button-secondary w-full"
                    href={getGameRoomHref(game)}
                  >
                    웹 경기방으로 보기
                  </OpenWebButton>
                  <MobileShareButton
                    className="community-button-secondary w-full justify-center"
                    text={summaryDescription}
                    title={`${game.awayTeam} VS ${game.homeTeam}`}
                    url={getMobileGameRoomHref(game)}
                  >
                    경기 공유
                  </MobileShareButton>
                </div>
              </MobileSection>

              <KboLineupPanel game={game} />
            </div>
          ) : null}

          {selectedTab === "relay" ? <LiveGamecastPanel game={game} /> : null}

          {selectedTab === "records" ? <KboBoxscorePanel game={game} /> : null}

          {selectedTab === "community" ? (
            <div className="space-y-3">
              <section className="community-panel">
                <div className="community-panel-header">
                  <div>
                    <h2 className="text-sm font-black text-[#071a3d]">
                      이 경기 관련 글
                    </h2>
                    <p className="mt-1 text-xs text-[#667085]">
                      같은 팀 태그 글을 묶어 봅니다.
                    </p>
                  </div>
                  <Link
                    className="community-button-secondary community-button-compact"
                    href={getMobileWriteReviewHref(game)}
                  >
                    글쓰기
                  </Link>
                </div>
                <RelatedPostSummaryPanel
                  description={summaryDescription}
                  tags={[game.awayTeam, game.homeTeam]}
                  title={summaryTitle}
                />
                <div className="grid gap-2 p-3">
                  {isPostsLoading ? (
                    <p className="text-sm text-[#667085]">
                      관련 글을 불러오는 중입니다.
                    </p>
                  ) : null}
                  {!isPostsLoading && relatedPosts.length === 0 ? (
                    <p className="text-sm text-[#667085]">
                      아직 관련 글이 없습니다.
                    </p>
                  ) : null}
                  {relatedPosts.map((post) => (
                    <RelatedPostCard key={post.id} post={post} />
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </main>
      </div>
    </section>
  );
}

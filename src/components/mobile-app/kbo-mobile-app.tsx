"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MobileAppStatusPanel } from "@/components/mobile-app/mobile-app-status-panel";
import { MobileInstallPrompt } from "@/components/mobile-app/mobile-install-prompt";
import { MobileNotificationSettings } from "@/components/mobile-app/mobile-notification-settings";
import {
  type KboGame,
  KBO_TEAMS,
  getMobileGameRoomHref,
  getScoreText,
  getStatusLabel,
  getTodayInputValue,
} from "@/lib/kbo/game";

type AppTab = "home" | "games" | "records" | "news" | "my";

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
  favoriteTeam: string | null;
};

type KboStandingRow = {
  rank: number;
  team: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winningRate: string;
  gamesBehind: string;
  streak: string;
};

type KboNewsArticle = {
  id: string;
  title: string;
  url: string;
  summary: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string | null;
};

type BriefingSource = {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string | null;
};

type UrlBriefing = {
  mode: "keyword" | "url";
  briefing: string;
  sources: BriefingSource[];
  toolName: string;
};

type BriefingResponse = {
  status: "ready" | "unavailable";
  message?: string;
  briefing?: UrlBriefing;
};

type NewsBriefingState = {
  isLoading: boolean;
  message: string;
  briefing?: UrlBriefing;
};

type CommunityPost = {
  id: string;
  title: string;
  author: {
    nickname: string;
  };
  tags: {
    id: string;
    name: string;
  }[];
  counts: {
    comments: number;
    views: number;
    voteScore: number;
  };
};

type MobileAppState = {
  user: CurrentUser | null;
  games: KboGame[];
  standings: KboStandingRow[];
  news: KboNewsArticle[];
  posts: CommunityPost[];
  message: string;
};

type PreferenceResponse = {
  user?: CurrentUser;
  message?: string;
};

const defaultState: MobileAppState = {
  user: null,
  games: [],
  standings: [],
  news: [],
  posts: [],
  message: "",
};

const tabs: Array<{ id: AppTab; label: string }> = [
  { id: "home", label: "홈" },
  { id: "games", label: "경기" },
  { id: "records", label: "기록" },
  { id: "news", label: "뉴스" },
  { id: "my", label: "MY" },
];
const MOBILE_APP_FETCH_TIMEOUT_MS = 8_000;

function formatTime(value: string | null): string {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPitcherText(game: KboGame): string {
  const pitchers = [
    game.awayStartingPitcher
      ? `${game.awayTeam} ${game.awayStartingPitcher.name}`
      : "",
    game.homeStartingPitcher
      ? `${game.homeTeam} ${game.homeStartingPitcher.name}`
      : "",
  ].filter(Boolean);

  return pitchers.length > 0 ? pitchers.join(" vs ") : "선발 미정";
}

function isTeamRelated(value: string, teamName: string): boolean {
  if (!teamName) {
    return false;
  }

  return value.toLowerCase().includes(teamName.toLowerCase());
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    MOBILE_APP_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function AppCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-[18px] border border-white/70 bg-white p-4 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}

function GameMiniCard({ game }: { game: KboGame }) {
  return (
    <Link
      className="block rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-3 active:scale-[0.99]"
      href={getMobileGameRoomHref(game)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-[#d71920]">
          {getStatusLabel(game.status)}
        </p>
        <p className="text-xs font-bold text-[#667085]">
          {game.time || "시간 미정"}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <p className="truncate text-sm font-black text-[#071a3d]">
          {game.awayTeam}
        </p>
        <p className="rounded-xl bg-[#071a3d] px-3 py-1 text-sm font-black text-white">
          {getScoreText(game)}
        </p>
        <p className="truncate text-sm font-black text-[#071a3d]">
          {game.homeTeam}
        </p>
      </div>
      <p className="mt-3 truncate text-xs font-bold text-[#667085]">
        {game.stadium || "구장 미정"} · {getPitcherText(game)}
      </p>
    </Link>
  );
}

function truncateForQuery(value: string, maxLength = 1400): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function createNewsWriteHref(
  article: KboNewsArticle,
  briefing?: UrlBriefing,
): string {
  const params = new URLSearchParams();
  const tags = Array.from(
    new Set(["KBO", "뉴스", article.source].filter(Boolean)),
  ).join(",");
  const content = [
    `기사 제목: ${article.title}`,
    article.summary ? `기사 요약: ${article.summary}` : "",
    briefing?.briefing ? `브리핑:\n${briefing.briefing}` : "",
    `원문: ${article.url}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  params.set("title", `[뉴스] ${article.title}`);
  params.set("content", truncateForQuery(content));
  params.set("tags", tags);

  return `/mobile-app/write?${params.toString()}`;
}

function NewsMiniCard({
  article,
  briefingState,
  onCreateBriefing,
}: {
  article: KboNewsArticle;
  briefingState?: NewsBriefingState;
  onCreateBriefing: (article: KboNewsArticle) => void;
}) {
  return (
    <article className="rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-3">
      <div className="flex gap-3">
        <div
          className="h-16 w-20 shrink-0 rounded-xl bg-[#e8edf5] bg-cover bg-center"
          style={
            article.imageUrl
              ? {
                  backgroundImage: `url("${article.imageUrl.replaceAll(
                    '"',
                    "%22",
                  )}")`,
                }
              : undefined
          }
        />
        <div className="min-w-0">
          <a
            className="line-clamp-2 text-sm font-black leading-5 text-[#202632]"
            href={article.url}
            rel="noreferrer"
            target="_blank"
          >
            {article.title}
          </a>
          <p className="mt-1 text-xs font-bold text-[#667085]">
            {article.source}
            {article.publishedAt ? ` · ${formatTime(article.publishedAt)}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <a
          className="rounded-full bg-white px-3 py-2 text-center text-xs font-black text-[#2f4f9f]"
          href={article.url}
          rel="noreferrer"
          target="_blank"
        >
          기사 보기
        </a>
        <button
          className="rounded-full bg-[#071a3d] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-[#c7cedb]"
          disabled={briefingState?.isLoading}
          onClick={() => onCreateBriefing(article)}
          type="button"
        >
          {briefingState?.isLoading ? "정리 중" : "브리핑"}
        </button>
        <Link
          className="rounded-full bg-[#d71920] px-3 py-2 text-center text-xs font-black text-white"
          href={createNewsWriteHref(article, briefingState?.briefing)}
        >
          글쓰기
        </Link>
      </div>

      {briefingState?.message ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#667085]">
          {briefingState.message}
        </p>
      ) : null}

      {briefingState?.briefing ? (
        <div className="mt-3 rounded-xl border border-[#d8deea] bg-white p-3">
          <p className="text-xs font-black text-[#d71920]">URL 브리핑</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#202632]">
            {briefingState.briefing.briefing}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function PostMiniCard({ post }: { post: CommunityPost }) {
  return (
    <Link
      className="block rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-3 active:scale-[0.99]"
      href={`/mobile-app/posts/${post.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm font-black leading-5 text-[#202632]">
          {post.title}
        </p>
        {post.counts.comments > 0 ? (
          <span className="shrink-0 text-xs font-black text-[#d71920]">
            [{post.counts.comments}]
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#667085]">
        <span className="font-bold text-[#344054]">{post.author.nickname}</span>
        <span>조회 {post.counts.views}</span>
        <span>추천 {post.counts.voteScore}</span>
      </div>
      {post.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {post.tags.slice(0, 3).map((tag) => (
            <span
              className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#2f4f9f]"
              key={tag.id}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

function TeamPicker({
  disabled,
  favoriteTeam,
  message,
  onSaveTeam,
}: {
  disabled: boolean;
  favoriteTeam: string;
  message: string;
  onSaveTeam: (teamName: string) => void;
}) {
  return (
    <AppCard className="bg-[#071a3d] text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-white/55">응원팀 설정</p>
          <h2 className="mt-1 text-lg font-black">
            {favoriteTeam ? `${favoriteTeam} 중심으로 보기` : "내 팀을 골라주세요"}
          </h2>
          <p className="mt-2 text-xs leading-5 text-white/65">
            앱에서 저장한 응원팀은 웹 홈과 마이페이지에도 같이 반영됩니다.
          </p>
        </div>
        {favoriteTeam ? (
          <button
            className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white"
            disabled={disabled}
            onClick={() => onSaveTeam("")}
            type="button"
          >
            해제
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {KBO_TEAMS.map((teamName) => (
          <button
            className={[
              "rounded-2xl px-2 py-2 text-xs font-black",
              favoriteTeam === teamName
                ? "bg-[#d71920] text-white"
                : "bg-white/10 text-white",
            ].join(" ")}
            disabled={disabled || favoriteTeam === teamName}
            key={teamName}
            onClick={() => onSaveTeam(teamName)}
            type="button"
          >
            {teamName}
          </button>
        ))}
      </div>

      {message ? (
        <p className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-white">
          {message}
        </p>
      ) : null}
    </AppCard>
  );
}

async function requestMobileAppState(): Promise<MobileAppState> {
  const today = getTodayInputValue();
  const [me, games, standings, news, posts] = await Promise.all([
    fetchJson<{ user: CurrentUser }>("/api/auth/me"),
    fetchJson<{
      result?: {
        games: KboGame[];
      };
    }>(`/api/ai/mcp/kbo-games?date=${today}`),
    fetchJson<{
      result?: {
        rows: KboStandingRow[];
      };
    }>("/api/kbo/standings"),
    fetchJson<{
      result?: {
        articles: KboNewsArticle[];
      };
    }>("/api/kbo/news?limit=6"),
    fetchJson<{
      posts: CommunityPost[];
    }>("/api/posts?page=1&pageSize=5&sort=views"),
  ]);

  return {
    user: me?.user ?? null,
    games: games?.result?.games ?? [],
    standings: standings?.result?.rows ?? [],
    news: news?.result?.articles ?? [],
    posts: posts?.posts ?? [],
    message:
      games || standings || news || posts
        ? ""
        : "앱 데이터를 불러오지 못했습니다.",
  };
}

function createMobileAppFallbackState(): MobileAppState {
  return {
    ...defaultState,
    message: "앱 데이터를 불러오지 못했습니다. 잠시 뒤 새로고침해주세요.",
  };
}

function requestMobileAppStateWithFallback(): Promise<MobileAppState> {
  return Promise.race([
    requestMobileAppState(),
    new Promise<MobileAppState>((resolve) => {
      window.setTimeout(
        () => resolve(createMobileAppFallbackState()),
        MOBILE_APP_FETCH_TIMEOUT_MS + 1_000,
      );
    }),
  ]);
}

export function KboMobileApp() {
  const [selectedTab, setSelectedTab] = useState<AppTab>("home");
  const [state, setState] = useState<MobileAppState>(defaultState);
  const [isLoading, setIsLoading] = useState(false);
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [newsBriefingStates, setNewsBriefingStates] = useState<
    Record<string, NewsBriefingState>
  >({});

  const favoriteTeam = state.user?.favoriteTeam ?? "";
  const favoriteStanding = useMemo(
    () => state.standings.find((row) => row.team === favoriteTeam) ?? null,
    [favoriteTeam, state.standings],
  );
  const teamPosts = useMemo(() => {
    if (!favoriteTeam) {
      return [];
    }

    return state.posts.filter((post) =>
      post.tags.some((tag) => tag.name.toLowerCase() === favoriteTeam.toLowerCase()),
    );
  }, [favoriteTeam, state.posts]);
  const teamNews = useMemo(() => {
    if (!favoriteTeam) {
      return [];
    }

    return state.news.filter((article) =>
      [article.title, article.summary].some((value) =>
        isTeamRelated(value, favoriteTeam),
      ),
    );
  }, [favoriteTeam, state.news]);
  const primaryGame = useMemo(() => {
    if (favoriteTeam) {
      return (
        state.games.find(
          (game) =>
            game.awayTeam === favoriteTeam || game.homeTeam === favoriteTeam,
        ) ?? state.games[0]
      );
    }

    return state.games[0];
  }, [favoriteTeam, state.games]);

  async function loadAppData() {
    setIsLoading(true);

    try {
      setState(await requestMobileAppStateWithFallback());
    } finally {
      setIsLoading(false);
    }
  }

  function handleRefresh() {
    setIsLoading(true);
    void loadAppData();
  }

  async function handleSaveFavoriteTeam(teamName: string) {
    if (!state.user) {
      setPreferenceMessage("로그인 후 응원팀을 저장할 수 있습니다.");
      setSelectedTab("my");
      return;
    }

    setIsSavingPreference(true);
    setPreferenceMessage("");

    try {
      const response = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          favoriteTeam: teamName,
        }),
      });
      const data = (await response.json()) as PreferenceResponse;

      if (!response.ok || !data.user) {
        throw new Error(data.message ?? "응원팀을 저장하지 못했습니다.");
      }

      setState((currentState) => ({
        ...currentState,
        user: data.user ?? currentState.user,
      }));
      setPreferenceMessage(
        data.user.favoriteTeam
          ? `${data.user.favoriteTeam} 중심으로 홈을 바꿨어요.`
          : "응원팀 설정을 해제했어요.",
      );
    } catch (error) {
      setPreferenceMessage(
        error instanceof Error
          ? error.message
          : "응원팀을 저장하지 못했습니다.",
      );
    } finally {
      setIsSavingPreference(false);
    }
  }

  async function handleCreateNewsBriefing(article: KboNewsArticle) {
    setNewsBriefingStates((current) => ({
      ...current,
      [article.id]: {
        isLoading: true,
        message: "뉴스 URL을 브리핑으로 정리하고 있어요.",
        briefing: current[article.id]?.briefing,
      },
    }));

    try {
      const response = await fetch("/api/ai/mcp/briefing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mode: "url",
          input: article.url,
        }),
      });
      const data = (await response.json()) as BriefingResponse;

      if (!response.ok || !data.briefing) {
        throw new Error(data.message ?? "뉴스 브리핑을 만들지 못했습니다.");
      }

      setNewsBriefingStates((current) => ({
        ...current,
        [article.id]: {
          isLoading: false,
          message: "브리핑을 만들었습니다. 바로 글쓰기에 활용할 수 있어요.",
          briefing: data.briefing,
        },
      }));
    } catch (error) {
      setNewsBriefingStates((current) => ({
        ...current,
        [article.id]: {
          isLoading: false,
          message:
            error instanceof Error
              ? error.message
              : "뉴스 브리핑을 만들지 못했습니다.",
          briefing: current[article.id]?.briefing,
        },
      }));
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      const nextState = await requestMobileAppStateWithFallback();

      if (isMounted) {
        setState(nextState);
        setIsLoading(false);
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="min-h-screen bg-[#dfe7f3] text-[#101827]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#f3f6fb] shadow-2xl md:my-6 md:min-h-[860px] md:overflow-hidden md:rounded-[32px] md:border md:border-white">
        <header className="bg-[#071a3d] px-5 pb-5 pt-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-white/55">My KBO App</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">
                KBO Fan Hub
              </h1>
            </div>
            <Link
              className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#071a3d]"
              href="/"
            >
              웹으로
            </Link>
          </div>
          <div className="mt-4 rounded-3xl bg-white/10 p-4">
            <p className="text-xs font-bold text-white/65">
              {state.user ? `${state.user.nickname}님` : "로그인 없이 둘러보기"}
            </p>
            <p className="mt-1 text-lg font-black">
              {favoriteTeam
                ? `${favoriteTeam} 소식을 먼저 보여드릴게요.`
                : "응원팀을 설정하면 홈이 달라집니다."}
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                className="rounded-full bg-[#d71920] px-3 py-2 text-xs font-black text-white"
                href={favoriteTeam ? `/?team=${encodeURIComponent(favoriteTeam)}` : "/me"}
              >
                {favoriteTeam ? "내 팀 홈" : "응원팀 설정"}
              </Link>
              <button
                className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white"
                disabled={isLoading}
                onClick={handleRefresh}
                type="button"
              >
                새로고침
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24">
          {state.message ? (
            <p className="mb-3 rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
              {state.message}
            </p>
          ) : null}

          {isLoading ? (
            <AppCard>
              <p className="text-sm font-bold text-[#667085]">
                앱 데이터를 불러오는 중입니다.
              </p>
            </AppCard>
          ) : null}

          {selectedTab === "home" ? (
            <div className="space-y-4">
              <MobileInstallPrompt />

              <TeamPicker
                disabled={isSavingPreference}
                favoriteTeam={favoriteTeam}
                message={preferenceMessage}
                onSaveTeam={handleSaveFavoriteTeam}
              />

              <AppCard className="bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-[#d71920]">
                      오늘의 경기
                    </p>
                    <h2 className="mt-1 text-xl font-black text-[#071a3d]">
                      {primaryGame
                        ? `${primaryGame.awayTeam} VS ${primaryGame.homeTeam}`
                        : "오늘 경기 정보"}
                    </h2>
                  </div>
                  <button
                    className="rounded-full bg-[#eef3ff] px-3 py-1.5 text-xs font-black text-[#2f4f9f]"
                    onClick={() => setSelectedTab("games")}
                    type="button"
                  >
                    전체 보기
                  </button>
                </div>
                {primaryGame ? (
                  <div className="mt-3">
                    <GameMiniCard game={primaryGame} />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#667085]">
                    오늘 등록된 경기 정보가 없습니다.
                  </p>
                )}
              </AppCard>

              {favoriteTeam ? (
                <AppCard>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-[#d71920]">
                        내 팀 요약
                      </p>
                      <h2 className="mt-1 text-lg font-black text-[#071a3d]">
                        {favoriteTeam}
                      </h2>
                    </div>
                    <Link
                      className="rounded-full bg-[#eef3ff] px-3 py-1.5 text-xs font-black text-[#2f4f9f]"
                      href={`/?team=${encodeURIComponent(favoriteTeam)}`}
                    >
                      팀 게시판
                    </Link>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-[#fbfcff] p-3">
                      <p className="text-[11px] font-black text-[#667085]">
                        순위
                      </p>
                      <p className="mt-1 text-xl font-black text-[#071a3d]">
                        {favoriteStanding ? `${favoriteStanding.rank}위` : "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#fbfcff] p-3">
                      <p className="text-[11px] font-black text-[#667085]">
                        승률
                      </p>
                      <p className="mt-1 text-xl font-black text-[#d71920]">
                        {favoriteStanding?.winningRate ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#fbfcff] p-3">
                      <p className="text-[11px] font-black text-[#667085]">
                        최근
                      </p>
                      <p className="mt-1 text-sm font-black text-[#071a3d]">
                        {favoriteStanding?.streak ?? "-"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {(teamPosts.length > 0 ? teamPosts : state.posts)
                      .slice(0, 2)
                      .map((post) => (
                        <PostMiniCard key={post.id} post={post} />
                      ))}
                  </div>
                </AppCard>
              ) : null}

              <div className="grid grid-cols-5 gap-2">
                {[
                  ["경기방", "games"],
                  ["기록실", "records"],
                  ["뉴스", "news"],
                  ["MY", "my"],
                ].map(([label, tab]) => (
                  <button
                    className="rounded-2xl bg-white px-2 py-3 text-xs font-black text-[#071a3d] shadow-sm"
                    key={label}
                    onClick={() => setSelectedTab(tab as AppTab)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
                <Link
                  className="flex items-center justify-center rounded-2xl bg-[#d71920] px-2 py-3 text-xs font-black text-white shadow-sm"
                  href="/mobile-app/write"
                >
                  글쓰기
                </Link>
              </div>

              <AppCard>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-[#071a3d]">
                    인기글
                  </h2>
                  <Link className="text-xs font-black text-[#2f4f9f]" href="/">
                    게시판
                  </Link>
                </div>
                <div className="mt-3 grid gap-2">
                  {state.posts.slice(0, 3).map((post) => (
                    <PostMiniCard key={post.id} post={post} />
                  ))}
                  {state.posts.length === 0 ? (
                    <p className="text-sm text-[#667085]">
                      아직 보여줄 게시글이 없습니다.
                    </p>
                  ) : null}
                </div>
              </AppCard>
            </div>
          ) : null}

          {selectedTab === "games" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-[#071a3d]">오늘 경기</h2>
                <Link
                  className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#2f4f9f]"
                  href="/#games"
                >
                  웹 경기판
                </Link>
              </div>
              {favoriteTeam ? (
                <p className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-[#667085]">
                  {favoriteTeam} 경기를 먼저 보여줍니다.
                </p>
              ) : null}
              {[...state.games]
                .sort((left, right) => {
                  if (!favoriteTeam) {
                    return 0;
                  }

                  const leftRelated =
                    left.awayTeam === favoriteTeam || left.homeTeam === favoriteTeam;
                  const rightRelated =
                    right.awayTeam === favoriteTeam || right.homeTeam === favoriteTeam;

                  if (leftRelated === rightRelated) {
                    return 0;
                  }

                  return leftRelated ? -1 : 1;
                })
                .map((game) => (
                <GameMiniCard game={game} key={`${game.gameDate}-${game.awayTeam}-${game.homeTeam}`} />
              ))}
              {state.games.length === 0 ? (
                <AppCard>
                  <p className="text-sm text-[#667085]">
                    오늘 경기 정보가 없습니다.
                  </p>
                </AppCard>
              ) : null}
            </div>
          ) : null}

          {selectedTab === "records" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-[#071a3d]">순위/기록</h2>
                <Link
                  className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#2f4f9f]"
                  href="/records"
                >
                  기록실
                </Link>
              </div>
              <AppCard>
                <ol className="divide-y divide-[#edf1f7]">
                  {state.standings.slice(0, 10).map((row) => (
                    <li
                      className="flex items-center gap-3 py-2"
                      key={row.team}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#071a3d] text-xs font-black text-white">
                        {row.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-[#202632]">
                          {row.team}
                        </p>
                        <p className="text-xs text-[#667085]">
                          {row.wins}승 {row.draws}무 {row.losses}패 ·{" "}
                          {row.streak}
                        </p>
                      </div>
                      <span className="text-sm font-black text-[#d71920]">
                        {row.winningRate}
                      </span>
                    </li>
                  ))}
                  {state.standings.length === 0 ? (
                    <li className="py-3 text-sm text-[#667085]">
                      순위 정보를 불러오지 못했습니다.
                    </li>
                  ) : null}
                </ol>
              </AppCard>
            </div>
          ) : null}

          {selectedTab === "news" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-[#071a3d]">KBO 뉴스</h2>
                <Link
                  className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#2f4f9f]"
                  href="/news"
                >
                  뉴스 페이지
                </Link>
              </div>
              {favoriteTeam && teamNews.length > 0 ? (
                <AppCard>
                  <p className="text-xs font-black text-[#d71920]">
                    {favoriteTeam} 관련 뉴스
                  </p>
                  <div className="mt-3 grid gap-2">
                    {teamNews.slice(0, 2).map((article) => (
                      <NewsMiniCard
                        article={article}
                        briefingState={newsBriefingStates[article.id]}
                        key={article.id}
                        onCreateBriefing={handleCreateNewsBriefing}
                      />
                    ))}
                  </div>
                </AppCard>
              ) : null}
              {state.news.map((article) => (
                <NewsMiniCard
                  article={article}
                  briefingState={newsBriefingStates[article.id]}
                  key={article.id}
                  onCreateBriefing={handleCreateNewsBriefing}
                />
              ))}
              {state.news.length === 0 ? (
                <AppCard>
                  <p className="text-sm text-[#667085]">
                    뉴스를 불러오지 못했습니다.
                  </p>
                </AppCard>
              ) : null}
            </div>
          ) : null}

          {selectedTab === "my" ? (
            <div className="space-y-3">
              <AppCard>
                <p className="text-xs font-black text-[#d71920]">MY</p>
                <h2 className="mt-1 text-xl font-black text-[#071a3d]">
                  {state.user ? state.user.nickname : "로그인이 필요합니다"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#667085]">
                  {state.user
                    ? `현재 응원팀은 ${favoriteTeam || "설정 안 함"}입니다.`
                    : "로그인하면 응원팀 홈과 내 활동을 앱에서 이어볼 수 있습니다."}
                </p>
                <div className="mt-4 grid gap-2">
                  <Link className="community-button-primary" href="/me">
                    마이페이지에서 설정
                  </Link>
                  {!state.user ? (
                    <Link className="community-button-secondary" href="/login">
                      로그인
                    </Link>
                  ) : null}
                </div>
              </AppCard>
              {state.user ? (
                <TeamPicker
                  disabled={isSavingPreference}
                  favoriteTeam={favoriteTeam}
                  message={preferenceMessage}
                  onSaveTeam={handleSaveFavoriteTeam}
                />
              ) : null}
              <MobileNotificationSettings favoriteTeam={favoriteTeam} />
              <MobileAppStatusPanel />
              <AppCard>
                <h3 className="text-base font-black text-[#071a3d]">
                  앱 개선안과 연결
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#667085]">
                  이 모바일 앱은 KBO 공식 서비스 분석에서 나온 개선안인
                  개인화 홈, 경기방 통합, 기록실 접근성, 뉴스 연결을 현재 웹
                  API와 연결한 프로토타입입니다.
                </p>
                <Link
                  className="community-button-secondary mt-4 w-full"
                  href="/portfolio/kbo-app"
                >
                  개선안 문서 보기
                </Link>
              </AppCard>
            </div>
          ) : null}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto grid w-full max-w-md grid-cols-5 gap-1 border-t border-[#d8deea] bg-white/95 px-3 pb-3 pt-2 shadow-[0_-12px_32px_rgba(15,23,42,0.14)] backdrop-blur md:absolute md:rounded-b-[32px]">
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
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { KBO_TEAMS } from "@/lib/kbo/game";

type MyPageUser = {
  id: string;
  email: string;
  nickname: string;
  favoriteTeam: string | null;
  createdAt: string;
};

type MyPagePost = {
  id: string;
  title: string;
  preview: string;
  viewCount: number;
  commentCount: number;
  upVotes: number;
  downVotes: number;
  voteScore: number;
  tags: {
    id: string;
    name: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

type MyPageComment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  post: {
    id: string;
    title: string;
  };
};

type MyPageVote = {
  id: string;
  type: "UP" | "DOWN";
  createdAt: string;
  updatedAt: string;
  post: {
    id: string;
    title: string;
    author: {
      id: string;
      email: string;
      nickname: string;
      createdAt: string;
    };
  };
};

type MyPageActivity = {
  user: MyPageUser;
  stats: {
    posts: number;
    comments: number;
    votes: number;
    views: number;
    receivedUpVotes: number;
    receivedDownVotes: number;
    receivedVoteScore: number;
  };
  recentPosts: MyPagePost[];
  recentComments: MyPageComment[];
  recentVotes: MyPageVote[];
};

type LoadState =
  | {
      status: "loading";
    }
  | {
      status: "guest";
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "success";
      data: MyPageActivity;
    };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatJoinDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function truncateText(value: string, maxLength = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={[
        "border bg-white p-3",
        tone === "accent" ? "border-[#fecdd3]" : "border-[#d8deea]",
      ].join(" ")}
    >
      <p className="text-xs font-bold text-[#64748b]">{label}</p>
      <p
        className={[
          "mt-1 text-2xl font-black",
          tone === "accent" ? "text-[#d71920]" : "text-[#071a3d]",
        ].join(" ")}
      >
        {value.toLocaleString("ko-KR")}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-t border-[#d8deea] bg-white px-4 py-6 text-center text-sm text-[#64748b]">
      {message}
    </div>
  );
}

function FavoriteTeamSettings({
  user,
  onUpdateUser,
}: {
  user: MyPageUser;
  onUpdateUser: (user: MyPageUser) => void;
}) {
  const [favoriteTeam, setFavoriteTeam] = useState(user.favoriteTeam ?? "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveFavoriteTeam() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          favoriteTeam,
        }),
      });
      const data = (await response.json()) as {
        user?: MyPageUser;
        message?: string;
      };

      if (!response.ok || !data.user) {
        throw new Error(data.message ?? "응원팀을 저장하지 못했습니다.");
      }

      onUpdateUser(data.user);
      setMessage(
        data.user.favoriteTeam
          ? `${data.user.favoriteTeam} 중심으로 홈 화면이 맞춰집니다.`
          : "응원팀 설정을 해제했습니다.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "응원팀을 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanged = favoriteTeam !== (user.favoriteTeam ?? "");

  return (
    <section className="community-subpanel bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-black text-[#071a3d]">응원팀 설정</h2>
          <p className="mt-1 text-sm leading-6 text-[#64748b]">
            홈에서 내 팀 경기, 팀 게시글, 관련 정보를 먼저 볼 수 있습니다.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="community-input min-w-44 text-sm"
            onChange={(event) => setFavoriteTeam(event.target.value)}
            value={favoriteTeam}
          >
            <option value="">설정 안 함</option>
            {KBO_TEAMS.map((teamName) => (
              <option key={teamName} value={teamName}>
                {teamName}
              </option>
            ))}
          </select>
          <button
            className="community-button-primary disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            disabled={isSaving || !hasChanged}
            onClick={() => void handleSaveFavoriteTeam()}
            type="button"
          >
            {isSaving ? "저장 중" : "저장"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="community-chip community-chip-accent">
          현재 응원팀 {user.favoriteTeam ?? "없음"}
        </span>
        {user.favoriteTeam ? (
          <Link
            className="community-chip community-chip-link"
            href={`/?team=${encodeURIComponent(user.favoriteTeam)}`}
          >
            내 팀 홈 보기
          </Link>
        ) : null}
      </div>

      {message ? (
        <p
          className={[
            "mt-3 rounded-sm border px-3 py-2 text-sm",
            message.includes("못했습니다") || message.includes("확인")
              ? "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]"
              : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]",
          ].join(" ")}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

export function MyPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      try {
        const response = await fetch("/api/me/activity", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          if (isMounted) {
            setState({ status: "guest" });
          }
          return;
        }

        if (!response.ok) {
          throw new Error("마이페이지 정보를 불러오지 못했습니다.");
        }

        const data = (await response.json()) as MyPageActivity;

        if (isMounted) {
          setState({ status: "success", data });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "마이페이지 정보를 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadActivity();

    return () => {
      isMounted = false;
    };
  }, []);

  const activity = state.status === "success" ? state.data : null;
  const totalReceivedVotes = useMemo(() => {
    if (!activity) {
      return 0;
    }

    return activity.stats.receivedUpVotes + activity.stats.receivedDownVotes;
  }, [activity]);

  function handleUpdateUser(user: MyPageUser) {
    setState((currentState) => {
      if (currentState.status !== "success") {
        return currentState;
      }

      return {
        status: "success",
        data: {
          ...currentState.data,
          user,
        },
      };
    });
  }

  return (
    <div className="page-shell">
      <div className="community-panel">
        <div className="community-page-header">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.08em] text-[#d71920]">
              My Page
            </p>
            <h1 className="mt-1 text-2xl font-black text-[#071a3d]">
              마이페이지
            </h1>
          </div>
          <Link className="community-button-secondary" href="/">
            게시판으로
          </Link>
        </div>

        {state.status === "loading" ? (
          <div className="bg-white px-4 py-12 text-center text-sm font-bold text-[#64748b]">
            내 활동을 불러오는 중입니다.
          </div>
        ) : null}

        {state.status === "guest" ? (
          <div className="bg-white px-4 py-12 text-center">
            <h2 className="text-xl font-black text-[#071a3d]">
              로그인이 필요합니다.
            </h2>
            <p className="mt-2 text-sm text-[#64748b]">
              내 글, 댓글, 추천 내역은 로그인 후 확인할 수 있습니다.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Link className="community-button-primary" href="/login">
                로그인
              </Link>
              <Link className="community-button-secondary" href="/signup">
                회원가입
              </Link>
            </div>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="bg-white px-4 py-12 text-center text-sm font-bold text-[#b91c1c]">
            {state.message}
          </div>
        ) : null}

        {activity ? (
          <div className="space-y-4 bg-[#f6f8fc] p-3 sm:p-4">
            <section className="community-subpanel bg-white p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#071a3d]">
                    {activity.user.nickname}
                  </h2>
                  <p className="mt-1 text-sm text-[#64748b]">
                    {activity.user.email}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#94a3b8]">
                    가입일 {formatJoinDate(activity.user.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="community-button-primary community-button-compact"
                    href="/posts/new"
                  >
                    글쓰기
                  </Link>
                  <Link
                    className="community-button-secondary community-button-compact"
                    href="/records"
                  >
                    순위/기록실
                  </Link>
                </div>
              </div>
            </section>

            <FavoriteTeamSettings
              onUpdateUser={handleUpdateUser}
              user={activity.user}
            />

            <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="작성 글" value={activity.stats.posts} />
              <StatCard label="작성 댓글" value={activity.stats.comments} />
              <StatCard label="추천 참여" value={activity.stats.votes} />
              <StatCard
                label="받은 추천 점수"
                tone="accent"
                value={activity.stats.receivedVoteScore}
              />
              <StatCard label="내 글 조회수" value={activity.stats.views} />
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
              <section className="community-panel">
                <div className="community-panel-header">
                  <h2 className="text-sm font-black text-[#071a3d]">
                    내 최근 게시글
                  </h2>
                  <span className="community-chip community-chip-compact">
                    {activity.recentPosts.length}개
                  </span>
                </div>

                {activity.recentPosts.length === 0 ? (
                  <EmptyState message="아직 작성한 게시글이 없습니다." />
                ) : (
                  <div className="divide-y divide-[#d8deea] bg-white">
                    {activity.recentPosts.map((post) => (
                      <article key={post.id} className="p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <Link
                              className="text-base font-black text-[#071a3d] hover:text-[#d71920]"
                              href={`/posts/${post.id}`}
                            >
                              {post.title}
                            </Link>
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#475569]">
                              {post.preview || "본문 미리보기가 없습니다."}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-[#94a3b8]">
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-[#64748b]">
                          <span>조회 {post.viewCount.toLocaleString("ko-KR")}</span>
                          <span>댓글 {post.commentCount.toLocaleString("ko-KR")}</span>
                          <span>추천 {post.voteScore.toLocaleString("ko-KR")}</span>
                          {post.tags.slice(0, 4).map((tag) => (
                            <Link
                              className="community-chip community-chip-compact community-chip-link"
                              href={`/?tag=${encodeURIComponent(tag.name)}`}
                              key={tag.id}
                            >
                              #{tag.name}
                            </Link>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <div className="space-y-4">
                <section className="community-panel">
                  <div className="community-panel-header">
                    <h2 className="text-sm font-black text-[#071a3d]">
                      내 최근 댓글
                    </h2>
                    <span className="community-chip community-chip-compact">
                      {activity.recentComments.length}개
                    </span>
                  </div>

                  {activity.recentComments.length === 0 ? (
                    <EmptyState message="아직 작성한 댓글이 없습니다." />
                  ) : (
                    <div className="divide-y divide-[#d8deea] bg-white">
                      {activity.recentComments.map((comment) => (
                        <article key={comment.id} className="p-4">
                          <Link
                            className="text-sm font-black text-[#071a3d] hover:text-[#d71920]"
                            href={`/posts/${comment.post.id}`}
                          >
                            {comment.post.title}
                          </Link>
                          <p className="mt-2 text-sm leading-6 text-[#475569]">
                            {truncateText(comment.content, 90)}
                          </p>
                          <p className="mt-2 text-xs font-bold text-[#94a3b8]">
                            {formatDate(comment.createdAt)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="community-panel">
                  <div className="community-panel-header">
                    <h2 className="text-sm font-black text-[#071a3d]">
                      추천/비추천 내역
                    </h2>
                    <span className="community-chip community-chip-compact">
                      받은 반응 {totalReceivedVotes.toLocaleString("ko-KR")}
                    </span>
                  </div>

                  {activity.recentVotes.length === 0 ? (
                    <EmptyState message="아직 추천하거나 비추천한 글이 없습니다." />
                  ) : (
                    <div className="divide-y divide-[#d8deea] bg-white">
                      {activity.recentVotes.map((vote) => (
                        <article key={vote.id} className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "community-chip community-chip-compact",
                                vote.type === "UP"
                                  ? "community-chip-accent"
                                  : "community-chip-muted",
                              ].join(" ")}
                            >
                              {vote.type === "UP" ? "추천" : "비추천"}
                            </span>
                            <span className="text-xs font-bold text-[#94a3b8]">
                              {formatDate(vote.updatedAt)}
                            </span>
                          </div>
                          <Link
                            className="mt-2 block text-sm font-black text-[#071a3d] hover:text-[#d71920]"
                            href={`/posts/${vote.post.id}`}
                          >
                            {vote.post.title}
                          </Link>
                          <p className="mt-1 text-xs font-bold text-[#64748b]">
                            작성자 {vote.post.author.nickname}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

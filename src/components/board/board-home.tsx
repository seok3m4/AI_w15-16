"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BoardAssistantPanel } from "@/components/ai/board-assistant-panel";
import { HotPostsPanel } from "@/components/board/hot-posts-panel";
import { TeamTabs } from "@/components/games/team-tabs";
import { TodayGameHub } from "@/components/games/today-game-hub";
import { PostList } from "@/components/posts/post-list";
import { TagFilterPanel } from "@/components/tags/tag-filter-panel";

type BoardHomeProps = {
  initialTags?: string[];
  initialTeam?: string;
};

type AuthMeResponse = {
  user?: {
    favoriteTeam: string | null;
  };
};

export function BoardHome({
  initialTags = [],
  initialTeam = "",
}: BoardHomeProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [selectedTeam, setSelectedTeam] = useState(initialTeam);
  const [favoriteTeam, setFavoriteTeam] = useState<string | null>(null);
  const [hasLoadedUserPreference, setHasLoadedUserPreference] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteTeam() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as AuthMeResponse;
        const nextFavoriteTeam = data.user?.favoriteTeam ?? null;

        if (isMounted) {
          setFavoriteTeam(nextFavoriteTeam);

          if (!initialTeam && nextFavoriteTeam) {
            setSelectedTeam((currentTeam) => currentTeam || nextFavoriteTeam);
          }
        }
      } catch {
        // 응원팀 개인화는 실패해도 기본 게시판 사용을 막지 않습니다.
      } finally {
        if (isMounted) {
          setHasLoadedUserPreference(true);
        }
      }
    }

    void loadFavoriteTeam();

    return () => {
      isMounted = false;
    };
  }, [initialTeam]);

  function handleToggleTag(tagName: string) {
    setSelectedTags((currentTags) => {
      const isSelected = currentTags.some(
        (selectedTag) => selectedTag.toLowerCase() === tagName.toLowerCase(),
      );

      if (isSelected) {
        return currentTags.filter(
          (selectedTag) => selectedTag.toLowerCase() !== tagName.toLowerCase(),
        );
      }

      return [...currentTags, tagName];
    });
    setPage(1);
  }

  function handleClearTags() {
    setSelectedTags([]);
    setPage(1);
  }

  function handleClearFilters() {
    setSelectedTags([]);
    setSelectedTeam("");
    setPage(1);
  }

  function handleSelectTeam(teamName: string) {
    setSelectedTeam(teamName);
    setPage(1);
  }

  return (
    <section className="page-shell space-y-4">
      <div className="community-panel">
        <div className="community-panel-header community-panel-header-stack">
          <div>
            <h1 className="text-base font-black text-[#071a3d]">
              {selectedTeam
                ? selectedTeam === favoriteTeam
                  ? `${selectedTeam} 응원팀 홈`
                  : `${selectedTeam} 게시판`
                : "전체 게시판"}
            </h1>
            <p className="mt-1 text-xs font-bold text-[#667085]">
              {selectedTeam === favoriteTeam && favoriteTeam
                ? "내 팀 경기와 관련 글을 먼저 모아봅니다."
                : "오늘 경기와 팀별 이야기를 모아봅니다."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {favoriteTeam ? (
              <button
                className={[
                  "community-chip",
                  selectedTeam === favoriteTeam
                    ? "community-chip-accent"
                    : "community-chip-link",
                ].join(" ")}
                onClick={() => handleSelectTeam(favoriteTeam)}
                type="button"
              >
                내 팀 {favoriteTeam}
              </button>
            ) : hasLoadedUserPreference ? (
              <Link className="community-chip community-chip-link" href="/me">
                응원팀 설정
              </Link>
            ) : null}
            <span className="community-chip community-chip-muted">
              태그 {selectedTags.length}개
            </span>
            <Link className="community-chip community-chip-link" href="/records">
              순위/기록실
            </Link>
            <Link className="community-chip community-chip-link" href="/news">
              뉴스
            </Link>
            <Link className="community-chip community-chip-dark" href="/posts/new">
              글쓰기
            </Link>
            {(selectedTeam || selectedTags.length > 0) ? (
              <button
                className="community-chip community-chip-link"
                onClick={handleClearFilters}
                type="button"
              >
                필터 초기화
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 border-t border-[#d8deea] bg-white p-2 text-center text-[11px] font-black text-[#475569] md:hidden">
          <a className="community-chip w-full" href="#games">
            오늘 경기
          </a>
          <Link className="community-chip w-full" href="/posts/new">
            글쓰기
          </Link>
          <Link className="community-chip w-full" href="/news">
            뉴스
          </Link>
          <Link className="community-chip w-full" href="/records">
            기록
          </Link>
        </div>
      </div>

      <div className="scroll-mt-24" id="games">
        <TodayGameHub
          onSelectTeam={handleSelectTeam}
          selectedTeam={selectedTeam}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="order-2 space-y-3 lg:order-none lg:sticky lg:top-28 lg:self-start">
          <TeamTabs onSelectTeam={handleSelectTeam} selectedTeam={selectedTeam} />
          <TagFilterPanel
            onClearTags={handleClearTags}
            onToggleTag={handleToggleTag}
            selectedTags={selectedTags}
          />
        </aside>

        <main className="order-1 min-w-0 lg:order-none">
          <PostList
            onClearFilters={handleClearFilters}
            onClearTags={handleClearTags}
            onPageChange={setPage}
            onSelectTeam={handleSelectTeam}
            onToggleTag={handleToggleTag}
            page={page}
            selectedTags={selectedTags}
            selectedTeam={selectedTeam}
          />
        </main>

        <aside className="order-3 space-y-3 lg:order-none lg:sticky lg:top-28 lg:self-start">
          <HotPostsPanel selectedTeam={selectedTeam} />
          <BoardAssistantPanel selectedTeam={selectedTeam} />
        </aside>
      </div>
    </section>
  );
}

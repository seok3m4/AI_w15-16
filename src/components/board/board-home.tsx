"use client";

import Link from "next/link";
import { useState } from "react";

import { BoardAssistantPanel } from "@/components/ai/board-assistant-panel";
import { HotPostsPanel } from "@/components/board/hot-posts-panel";
import { TeamTabs } from "@/components/games/team-tabs";
import { TodayGameHub } from "@/components/games/today-game-hub";
import { PostList } from "@/components/posts/post-list";
import { TagFilterPanel } from "@/components/tags/tag-filter-panel";

type BoardHomeProps = {
  initialTags?: string[];
};

export function BoardHome({ initialTags = [] }: BoardHomeProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [page, setPage] = useState(1);

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
              {selectedTeam ? `${selectedTeam} 게시판` : "전체 게시판"}
            </h1>
            <p className="mt-1 text-xs font-bold text-[#667085]">
              오늘 경기와 팀별 이야기를 모아봅니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
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

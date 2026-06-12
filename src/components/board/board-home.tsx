"use client";

import { useState } from "react";

import { KboGamesPanel } from "@/components/ai/kbo-games-panel";
import { KboStandingsPanel } from "@/components/ai/kbo-standings-panel";
import { McpBriefingPanel } from "@/components/ai/mcp-briefing-panel";
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
    <section className="mx-auto max-w-7xl px-4 py-5">
      <div className="overflow-hidden rounded-sm border border-[#b9c3d7] bg-white">
        <div className="flex flex-col gap-2 border-b border-[#d8deea] bg-[#f6f8fc] px-4 py-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#1f3470]">
              KBO Talk
            </h1>
            <p className="mt-1 text-sm text-[#667085]">
              경기 리뷰, 선수 분석, 팀 소식, 뉴스 링크를 자유롭게 공유하는 게시판
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs font-bold text-[#4b5563]">
            <span className="rounded-sm border border-[#d8deea] bg-white px-2 py-1">
              경기 리뷰
            </span>
            <span className="rounded-sm border border-[#d8deea] bg-white px-2 py-1">
              선수 분석
            </span>
            <span className="rounded-sm border border-[#d8deea] bg-white px-2 py-1">
              팀 이슈
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <TeamTabs onSelectTeam={handleSelectTeam} selectedTeam={selectedTeam} />
        <TodayGameHub
          onSelectTeam={handleSelectTeam}
          selectedTeam={selectedTeam}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <TagFilterPanel
            onClearTags={handleClearTags}
            onToggleTag={handleToggleTag}
            selectedTags={selectedTags}
          />
          <KboStandingsPanel />
        </aside>

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

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <HotPostsPanel selectedTeam={selectedTeam} />
          <div className="rounded-sm border border-[#b9c3d7] bg-[#f6f8fc] px-3 py-2">
            <h2 className="text-sm font-black text-[#1f3470]">경기 정보</h2>
          </div>
          <div className="grid gap-3">
            <KboGamesPanel />
            <McpBriefingPanel />
          </div>
        </aside>
      </div>
    </section>
  );
}

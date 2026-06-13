"use client";

import { useState } from "react";

import { KboStandingsPanel } from "@/components/ai/kbo-standings-panel";
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
      <div className="overflow-hidden rounded-sm border border-[#172554] bg-white">
        <div className="border-b border-[#172554] bg-[#071a3d] px-4 py-3 text-white">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              KBO Talk
            </h1>
            <p className="mt-1 text-sm text-white/75">
              경기 결과와 팀 이슈를 모아 보는 야구 커뮤니티
            </p>
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

      <div className="mt-4 grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_320px]">
        <aside className="order-2 space-y-3 lg:order-none lg:sticky lg:top-4 lg:self-start">
          <TagFilterPanel
            onClearTags={handleClearTags}
            onToggleTag={handleToggleTag}
            selectedTags={selectedTags}
          />
          <KboStandingsPanel />
        </aside>

        <div className="order-1 lg:order-none">
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
        </div>

        <aside className="order-3 space-y-3 lg:order-none lg:sticky lg:top-4 lg:self-start">
          <HotPostsPanel selectedTeam={selectedTeam} />
        </aside>
      </div>
    </section>
  );
}

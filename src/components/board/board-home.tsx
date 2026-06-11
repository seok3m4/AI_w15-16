"use client";

import { useState } from "react";

import { KboGamesPanel } from "@/components/ai/kbo-games-panel";
import { KboStandingsPanel } from "@/components/ai/kbo-standings-panel";
import { McpBriefingPanel } from "@/components/ai/mcp-briefing-panel";
import { PostList } from "@/components/posts/post-list";
import { TagFilterPanel } from "@/components/tags/tag-filter-panel";

export function BoardHome() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
        <div className="flex flex-wrap gap-1 border-b border-[#d8deea] bg-white px-4 py-2 text-xs font-bold text-[#667085]">
          <span className="rounded-sm bg-[#2f4f9f] px-2 py-1 text-white">
            전체글
          </span>
          <span className="rounded-sm px-2 py-1">인기 태그</span>
          <span className="rounded-sm px-2 py-1">경기 정보</span>
          <span className="rounded-sm px-2 py-1">뉴스</span>
        </div>
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
          onClearTags={handleClearTags}
          onPageChange={setPage}
          onToggleTag={handleToggleTag}
          page={page}
          selectedTags={selectedTags}
        />

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
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

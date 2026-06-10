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
        (selectedTag) =>
          selectedTag.toLowerCase() === tagName.toLowerCase(),
      );

      if (isSelected) {
        return currentTags.filter(
          (selectedTag) =>
            selectedTag.toLowerCase() !== tagName.toLowerCase(),
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
    <section className="mx-auto max-w-7xl px-6 py-8">
      <div className="overflow-hidden rounded-md border border-[#1f3768] bg-[#071a3d] text-white shadow-[0_20px_48px_rgba(7,26,61,0.18)]">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffb4b7]">
              Baseball Community
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              오늘의 야구 이슈를 AI와 함께 정리합니다
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              경기 리뷰, 선수 분석, KBO 뉴스 링크를 한 곳에서 모으고 RAG,
              MCP, Agent 도구로 게시글 작성과 정보 확인을 빠르게 이어갑니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["RAG", "유사 글"],
              ["MCP", "뉴스·URL"],
              ["Agent", "리뷰 초안"],
            ].map(([label, value]) => (
              <div
                className="rounded-md border border-white/10 bg-white/10 px-3 py-4"
                key={label}
              >
                <p className="text-xs font-black uppercase tracking-widest text-[#ffb4b7]">
                  {label}
                </p>
                <p className="mt-2 text-sm font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid border-t border-white/10 bg-[#031129] px-6 py-3 text-xs font-bold uppercase tracking-wide text-white/60 sm:grid-cols-3">
          <span>Post CRUD</span>
          <span>Tag Search</span>
          <span>KBO Data Tools</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)_328px]">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
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

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-md bg-[#071a3d] px-4 py-3 text-white">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb4b7]">
              AI Tools
            </p>
            <h2 className="mt-1 text-lg font-black">경기 정보 도구</h2>
          </div>
          <div className="grid gap-4">
            <KboGamesPanel />
            <McpBriefingPanel />
          </div>
        </aside>
      </div>
    </section>
  );
}

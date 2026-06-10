"use client";

import { useState } from "react";

import { KboGamesPanel } from "@/components/ai/kbo-games-panel";
import { McpBriefingPanel } from "@/components/ai/mcp-briefing-panel";
import { PostList } from "@/components/posts/post-list";
import { TagFilterPanel } from "@/components/tags/tag-filter-panel";

export function BoardHome() {
  const [selectedTag, setSelectedTag] = useState("");
  const [page, setPage] = useState(1);

  function handleSelectTag(tagName: string) {
    setSelectedTag(tagName);
    setPage(1);
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <PostList
          onPageChange={setPage}
          onSelectTag={handleSelectTag}
          page={page}
          selectedTag={selectedTag}
        />

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <TagFilterPanel
            onSelectTag={handleSelectTag}
            selectedTag={selectedTag}
          />
        </aside>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-[#172033]">AI 경기 정보 도구</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <KboGamesPanel />
          <McpBriefingPanel />
        </div>
      </section>
    </section>
  );
}

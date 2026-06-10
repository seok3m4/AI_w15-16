"use client";

import { useState } from "react";

import { McpBriefingPanel } from "@/components/ai/mcp-briefing-panel";
import { PostList } from "@/components/posts/post-list";
import { TagFilterPanel } from "@/components/tags/tag-filter-panel";

const aiActions = ["유사 글 추천", "뉴스 브리핑", "리뷰 초안 작성"];

export function BoardHome() {
  const [selectedTag, setSelectedTag] = useState("");
  const [page, setPage] = useState(1);

  function handleSelectTag(tagName: string) {
    setSelectedTag(tagName);
    setPage(1);
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
      <PostList
        onPageChange={setPage}
        onSelectTag={handleSelectTag}
        page={page}
        selectedTag={selectedTag}
      />

      <aside className="space-y-4">
        <TagFilterPanel
          onSelectTag={handleSelectTag}
          selectedTag={selectedTag}
        />

        <McpBriefingPanel />

        <section className="rounded-md border border-[#d9e2ec] bg-white p-5">
          <h2 className="text-base font-semibold">AI 글쓰기 도구</h2>
          <div className="mt-4 grid gap-2">
            {aiActions.map((action) => (
              <button
                className="rounded-md border border-[#c8d3df] px-3 py-2 text-left text-sm font-medium hover:border-[#0f766e] hover:bg-[#f0fdfa]"
                key={action}
                type="button"
              >
                {action}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-[#d9e2ec] bg-white p-5">
          <h2 className="text-base font-semibold">현재 구현 범위</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5e6a7d]">
            <li>회원가입, 로그인, 게시글 CRUD</li>
            <li>댓글, 태그, 검색, 페이지네이션 UI</li>
            <li>RAG 기반 유사 야구 게시글 추천 예정</li>
            <li>MCP 기반 뉴스와 URL 브리핑 예정</li>
            <li>Agent 기반 경기 리뷰 작성 도우미 예정</li>
          </ul>
        </section>
      </aside>
    </section>
  );
}

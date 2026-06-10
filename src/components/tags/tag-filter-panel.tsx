"use client";

import { useEffect, useState } from "react";

type TagWithCount = {
  id: string;
  name: string;
  counts: {
    posts: number;
  };
};

type TagsResponse = {
  tags?: TagWithCount[];
};

type TagFilterPanelProps = {
  selectedTags: string[];
  onToggleTag: (tagName: string) => void;
  onClearTags: () => void;
};

const DEFAULT_VISIBLE_TAG_COUNT = 8;

export function TagFilterPanel({
  selectedTags,
  onToggleTag,
  onClearTags,
}: TagFilterPanelProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTags() {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch("/api/tags", {
          credentials: "include",
        });
        const data = (await response.json()) as TagsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !data.tags) {
          setMessage("태그를 불러오지 못했습니다.");
          setTags([]);
          return;
        }

        setTags(data.tags);
      } catch {
        if (isMounted) {
          setMessage("네트워크 연결을 확인해주세요.");
          setTags([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTags();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasHiddenTags = tags.length > DEFAULT_VISIBLE_TAG_COUNT;
  const selectedHiddenTags = tags.filter(
    (tag, index) =>
      selectedTags.some(
        (selectedTag) =>
          selectedTag.toLowerCase() === tag.name.toLowerCase(),
      ) && index >= DEFAULT_VISIBLE_TAG_COUNT,
  );
  const visibleTags = isExpanded
    ? tags
    : [
        ...tags.slice(0, DEFAULT_VISIBLE_TAG_COUNT),
        ...selectedHiddenTags,
      ];
  const hiddenTagCount = Math.max(
    tags.length - DEFAULT_VISIBLE_TAG_COUNT - selectedHiddenTags.length,
    0,
  );

  return (
    <section className="kbo-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-[#071a3d] px-4 py-3 text-white">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb4b7]">
            Topics
          </p>
          <h2 className="mt-1 text-base font-black">태그</h2>
        </div>
        {selectedTags.length > 0 ? (
          <button
            className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white/80 hover:bg-white/20 hover:text-white"
            onClick={onClearTags}
            type="button"
          >
            전체 보기
          </button>
        ) : null}
      </div>

      <div className="p-4">
      {isLoading ? (
        <p className="text-sm text-[#64748b]">태그를 불러오는 중입니다.</p>
      ) : null}

      {message ? (
        <p className="text-sm text-[#b91c1c]">{message}</p>
      ) : null}

      {!isLoading && tags.length === 0 ? (
        <p className="text-sm leading-6 text-[#64748b]">
          아직 등록된 태그가 없습니다.
        </p>
      ) : null}

      <div className="grid gap-2">
        {visibleTags.map((tag) => {
          const isSelected = selectedTags.some(
            (selectedTag) =>
              selectedTag.toLowerCase() === tag.name.toLowerCase(),
          );

          return (
            <button
              className={
                isSelected
                  ? "flex items-center justify-between rounded-md border border-[#d71920] bg-[#fff1f2] px-3 py-2 text-left text-sm font-black text-[#d71920]"
                  : "flex items-center justify-between rounded-md border border-[#d7dde8] bg-white px-3 py-2 text-left text-sm font-bold text-[#475569] hover:border-[#d71920] hover:bg-[#fff7f7] hover:text-[#d71920]"
              }
              key={tag.id}
              onClick={() => onToggleTag(tag.name)}
              type="button"
            >
              <span>#{tag.name}</span>
              <span
                className={
                  isSelected
                    ? "rounded-md bg-[#d71920] px-2 py-0.5 text-xs text-white"
                    : "rounded-md bg-[#eef2f7] px-2 py-0.5 text-xs text-[#64748b]"
                }
              >
                {tag.counts.posts}
              </span>
            </button>
          );
        })}
      </div>

      {hasHiddenTags && (isExpanded || hiddenTagCount > 0) ? (
        <button
          className="mt-3 h-9 w-full rounded-md border border-[#c8d3df] bg-[#f8fafc] px-3 text-sm font-bold text-[#64748b] hover:border-[#d71920] hover:bg-[#fff1f2] hover:text-[#d71920]"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          {isExpanded ? "태그 접기" : `태그 더보기 ${hiddenTagCount}개`}
        </button>
      ) : null}
      </div>
    </section>
  );
}

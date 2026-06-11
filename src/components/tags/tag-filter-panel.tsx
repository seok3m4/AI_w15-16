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

const DEFAULT_VISIBLE_TAG_COUNT = 10;

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
    : [...tags.slice(0, DEFAULT_VISIBLE_TAG_COUNT), ...selectedHiddenTags];
  const hiddenTagCount = Math.max(
    tags.length - DEFAULT_VISIBLE_TAG_COUNT - selectedHiddenTags.length,
    0,
  );

  return (
    <section className="overflow-hidden rounded-sm border border-[#b9c3d7] bg-white">
      <div className="flex items-center justify-between border-b border-[#d8deea] bg-[#f6f8fc] px-3 py-2">
        <h2 className="text-sm font-black text-[#1f3470]">말머리</h2>
        {selectedTags.length > 0 ? (
          <button
            className="text-xs font-bold text-[#667085] hover:text-[#2f4f9f] hover:underline"
            onClick={onClearTags}
            type="button"
          >
            전체
          </button>
        ) : null}
      </div>

      <div className="p-2">
        {isLoading ? (
          <p className="px-1 py-2 text-xs text-[#667085]">
            태그를 불러오는 중입니다.
          </p>
        ) : null}

        {message ? (
          <p className="px-1 py-2 text-xs text-[#b91c1c]">{message}</p>
        ) : null}

        {!isLoading && tags.length === 0 ? (
          <p className="px-1 py-2 text-xs leading-5 text-[#667085]">
            아직 등록된 태그가 없습니다.
          </p>
        ) : null}

        <div className="grid gap-1">
          {visibleTags.map((tag) => {
            const isSelected = selectedTags.some(
              (selectedTag) =>
                selectedTag.toLowerCase() === tag.name.toLowerCase(),
            );

            return (
              <button
                className={
                  isSelected
                    ? "flex items-center justify-between rounded-sm bg-[#2f4f9f] px-2 py-1.5 text-left text-xs font-bold text-white"
                    : "flex items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs font-bold text-[#4b5563] hover:bg-[#eef3ff] hover:text-[#1f3470]"
                }
                key={tag.id}
                onClick={() => onToggleTag(tag.name)}
                type="button"
              >
                <span className="truncate">#{tag.name}</span>
                <span
                  className={
                    isSelected
                      ? "ml-2 rounded-sm bg-white/20 px-1.5 py-0.5 text-[11px]"
                      : "ml-2 rounded-sm bg-[#eef2f7] px-1.5 py-0.5 text-[11px] text-[#667085]"
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
            className="mt-2 h-8 w-full rounded-sm border border-[#d8deea] bg-[#f6f8fc] text-xs font-bold text-[#4b5563] hover:border-[#2f4f9f] hover:text-[#1f3470]"
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
          >
            {isExpanded ? "접기" : `더보기 ${hiddenTagCount}개`}
          </button>
        ) : null}
      </div>
    </section>
  );
}

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

  const activeTags = tags.filter((tag) => tag.counts.posts > 0);
  const hasHiddenTags = activeTags.length > DEFAULT_VISIBLE_TAG_COUNT;
  const selectedHiddenTags = activeTags.filter(
    (tag, index) =>
      selectedTags.some(
        (selectedTag) =>
          selectedTag.toLowerCase() === tag.name.toLowerCase(),
      ) && index >= DEFAULT_VISIBLE_TAG_COUNT,
  );
  const visibleTags = isExpanded
    ? activeTags
    : [
        ...activeTags.slice(0, DEFAULT_VISIBLE_TAG_COUNT),
        ...selectedHiddenTags,
      ];
  const hiddenTagCount = Math.max(
    activeTags.length - DEFAULT_VISIBLE_TAG_COUNT - selectedHiddenTags.length,
    0,
  );

  return (
    <section className="community-panel">
      <div className="community-panel-header">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-[#1f3470]">태그</h2>
          {selectedTags.length > 0 ? (
            <span className="community-chip community-chip-link px-1.5 py-0.5 text-[11px]">
              {selectedTags.length}
            </span>
          ) : null}
        </div>
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
        {selectedTags.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5 border-b border-[#edf1f7] pb-2">
            {selectedTags.map((tagName) => (
              <button
                className="community-chip community-chip-link px-2 py-1 text-[11px]"
                key={tagName}
                onClick={() => onToggleTag(tagName)}
                type="button"
              >
                #{tagName}
              </button>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <p className="px-1 py-2 text-xs text-[#667085]">
            태그를 불러오는 중입니다.
          </p>
        ) : null}

        {message ? (
          <p className="px-1 py-2 text-xs text-[#b91c1c]">{message}</p>
        ) : null}

        {!isLoading && activeTags.length === 0 ? (
          <p className="px-1 py-2 text-xs leading-5 text-[#667085]">
            아직 등록된 태그가 없습니다.
          </p>
        ) : null}

        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
          {visibleTags.map((tag) => {
            const isSelected = selectedTags.some(
              (selectedTag) =>
                selectedTag.toLowerCase() === tag.name.toLowerCase(),
            );

            return (
              <button
                className={
                  isSelected
                    ? "flex items-center justify-between rounded-sm bg-[#2f4f9f] px-2.5 py-2 text-left text-xs font-bold text-white"
                    : "flex items-center justify-between rounded-sm border border-transparent px-2.5 py-2 text-left text-xs font-bold text-[#4b5563] hover:border-[#d8deea] hover:bg-[#eef3ff] hover:text-[#1f3470]"
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

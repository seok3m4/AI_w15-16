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
  selectedTag: string;
  onSelectTag: (tagName: string) => void;
};

export function TagFilterPanel({
  selectedTag,
  onSelectTag,
}: TagFilterPanelProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <section className="rounded-md border border-[#d9e2ec] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">태그</h2>
        {selectedTag ? (
          <button
            className="text-xs font-semibold text-[#0f766e] hover:text-[#115e59]"
            onClick={() => onSelectTag("")}
            type="button"
          >
            전체 보기
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-[#5e6a7d]">태그를 불러오는 중입니다.</p>
      ) : null}

      {message ? (
        <p className="mt-3 text-sm text-[#b91c1c]">{message}</p>
      ) : null}

      {!isLoading && tags.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-[#5e6a7d]">
          아직 등록된 태그가 없습니다.
        </p>
      ) : null}

      <div className="mt-4 grid gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTag === tag.name;

          return (
            <button
              className={
                isSelected
                  ? "flex items-center justify-between rounded-md border border-[#0f766e] bg-[#f0fdfa] px-3 py-2 text-left text-sm font-semibold text-[#0f766e]"
                  : "flex items-center justify-between rounded-md border border-[#c8d3df] px-3 py-2 text-left text-sm font-medium text-[#5e6a7d] hover:border-[#0f766e] hover:bg-[#f0fdfa]"
              }
              key={tag.id}
              onClick={() => onSelectTag(isSelected ? "" : tag.name)}
              type="button"
            >
              <span>#{tag.name}</span>
              <span>{tag.counts.posts}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

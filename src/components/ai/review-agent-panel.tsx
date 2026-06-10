"use client";

import { FormEvent, useState } from "react";

type AgentStep = {
  iteration: number;
  toolName: string;
  status: "success" | "error" | "skipped";
  summary: string;
};

type AgentSource = {
  title: string;
  url: string;
  source?: string;
};

type ReviewAgentResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: {
    title: string;
    tags: string[];
    draft: string;
    checklist: string[];
    steps: AgentStep[];
    sources: AgentSource[];
  };
};

export type ReviewAgentDraft = {
  title: string;
  draft: string;
  tags: string[];
};

type ReviewAgentPanelProps = {
  onApplyDraft?: (draft: ReviewAgentDraft) => void;
};

export function ReviewAgentPanel({ onApplyDraft }: ReviewAgentPanelProps) {
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [memo, setMemo] = useState("");
  const [data, setData] = useState<ReviewAgentResponse | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplyMessage("");

    if (memo.trim().length < 10) {
      setData({
        status: "unavailable",
        message: "경기 메모를 10자 이상 입력해주세요.",
      });
      return;
    }

    setIsLoading(true);
    setData(null);

    try {
      const response = await fetch("/api/ai/agent/review-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          favoriteTeam,
          memo,
        }),
      });
      const responseData = (await response.json()) as ReviewAgentResponse;

      if (!response.ok) {
        setData({
          status: "unavailable",
          message:
            responseData.message ?? "경기 리뷰 초안을 생성하지 못했습니다.",
        });
        return;
      }

      setData(responseData);
    } catch {
      setData({
        status: "unavailable",
        message: "네트워크 연결을 확인해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleApplyDraft() {
    if (!data?.result || !onApplyDraft) {
      return;
    }

    onApplyDraft({
      title: data.result.title,
      draft: data.result.draft,
      tags: data.result.tags,
    });
    setApplyMessage("AI 초안을 작성 폼에 적용했습니다.");
  }

  return (
    <section className="rounded-md border border-[#d9e2ec] bg-white p-5">
      <div className="border-b border-[#d9e2ec] pb-3">
        <h2 className="text-base font-semibold">경기 리뷰 도우미</h2>
        <p className="mt-1 text-sm leading-6 text-[#5e6a7d]">
          경기 메모를 바탕으로 도구를 선택해 리뷰 초안을 만듭니다.
        </p>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <input
          className="h-10 rounded-md border border-[#c8d3df] bg-white px-3 text-sm outline-none focus:border-[#0f766e]"
          onChange={(event) => setFavoriteTeam(event.target.value)}
          placeholder="응원팀 또는 관심팀"
          type="text"
          value={favoriteTeam}
        />
        <textarea
          className="min-h-32 resize-y rounded-md border border-[#c8d3df] bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#0f766e]"
          maxLength={1200}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="예: 선발이 초반 흔들렸지만 불펜이 버텼고 8회 역전타가 인상적이었다."
          required
          value={memo}
        />
        <button
          className="h-10 rounded-md bg-[#0f766e] px-4 text-sm font-semibold text-white hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isLoading || memo.trim().length === 0}
          type="submit"
        >
          {isLoading ? "초안 작성 중" : "리뷰 초안 생성"}
        </button>
      </form>

      {data?.message ? (
        <p className="mt-4 rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {data?.result ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-md bg-[#eef4f7] p-3">
            <p className="text-xs font-semibold uppercase text-[#5e6a7d]">
              추천 제목
            </p>
            <h3 className="mt-2 text-base font-semibold text-[#172033]">
              {data.result.title}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.result.tags.map((tag) => (
              <span
                className="rounded-md bg-[#e6f4f1] px-2.5 py-1 text-xs font-semibold text-[#0f766e]"
                key={tag}
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="rounded-md border border-[#d9e2ec] bg-[#fbfcfd] p-3">
            <p className="text-xs font-semibold uppercase text-[#5e6a7d]">
              리뷰 초안
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#172033]">
              {data.result.draft}
            </p>
          </div>

          {onApplyDraft ? (
            <div>
              <button
                className="h-10 w-full rounded-md bg-[#172033] px-4 text-sm font-semibold text-white hover:bg-[#2b3548]"
                onClick={handleApplyDraft}
                type="button"
              >
                작성 폼에 초안 적용
              </button>
              {applyMessage ? (
                <p className="mt-2 rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-sm text-[#166534]">
                  {applyMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          {data.result.checklist.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-[#5e6a7d]">
                보완 체크
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-[#5e6a7d]">
                {data.result.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.result.steps.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-[#5e6a7d]">
                작성 과정
              </p>
              <div className="mt-2 grid gap-2">
                {data.result.steps.map((step) => (
                  <div
                    className="rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-xs leading-5 text-[#5e6a7d]"
                    key={`${step.iteration}-${step.toolName}-${step.summary}`}
                  >
                    <span className="font-semibold text-[#172033]">
                      {step.toolName}
                    </span>
                    <span> · {step.status}</span>
                    <p>{step.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.result.sources.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-[#5e6a7d]">
                참고 출처
              </p>
              <div className="mt-2 grid gap-2">
                {data.result.sources.map((source) => (
                  <a
                    className="rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-sm hover:border-[#0f766e]"
                    href={source.url}
                    key={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

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

function getStepLabel(step: AgentStep): string {
  if (step.toolName === "recommend_review_tags") {
    return "태그 추천";
  }

  if (step.toolName === "search_board_posts") {
    return "관련 글 확인";
  }

  if (step.toolName === "fetch_baseball_news_briefing") {
    return "기사 확인";
  }

  if (step.toolName === "fetch_kbo_games") {
    return "경기 정보 확인";
  }

  if (step.toolName === "fetch_kbo_game_record") {
    return "기록 확인";
  }

  return step.status === "success" ? "자료 확인" : "확인 필요";
}

export function ReviewAgentPanel({ onApplyDraft }: ReviewAgentPanelProps) {
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [gameDate, setGameDate] = useState("");
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
          gameDate,
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
    setApplyMessage("초안을 작성 폼에 적용했습니다.");
  }

  return (
    <section className="community-panel">
      <div className="community-panel-header">
        <div>
          <h2 className="text-sm font-black text-[#071a3d]">리뷰 초안</h2>
          <p className="mt-0.5 text-[11px] text-[#667085]">
            경기 메모를 바탕으로 글의 뼈대를 잡아줍니다.
          </p>
        </div>
        <span className="rounded-sm bg-[#eef3ff] px-2 py-1 text-[11px] font-black text-[#2f4f9f]">
          보조 작성
        </span>
      </div>

      <form className="grid gap-3 px-3 py-3" onSubmit={handleSubmit}>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black text-[#667085]">
            응원팀 또는 관심팀
          </span>
          <input
            className="community-input text-sm"
            onChange={(event) => setFavoriteTeam(event.target.value)}
            placeholder="예: KIA, LG"
            type="text"
            value={favoriteTeam}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-[11px] font-black text-[#667085]">경기 날짜</span>
          <input
            className="community-input text-sm"
            onChange={(event) => setGameDate(event.target.value)}
            type="date"
            value={gameDate}
          />
        </label>

        <label className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-[#667085]">경기 메모</span>
            <span className="text-[11px] font-bold text-[#667085]">
              {memo.length} / 1200
            </span>
          </div>
          <textarea
            className="community-textarea min-h-32 resize-y text-sm leading-6"
            maxLength={1200}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="예: 선발이 초반 흔들렸지만 불펜이 버텼고 8회 역전타가 인상적이었다."
            required
            value={memo}
          />
        </label>

        <button
          className="community-button-primary w-full disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isLoading || memo.trim().length === 0}
          type="submit"
        >
          {isLoading ? "초안 작성 중" : "리뷰 초안 생성"}
        </button>
      </form>

      {data?.message ? (
        <p className="mx-3 mb-3 rounded-sm border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
          {data.message}
        </p>
      ) : null}

      {data?.result ? (
        <div className="grid gap-3 border-t border-[#edf1f7] px-3 py-3">
          <div className="rounded-sm border border-[#d8deea] bg-[#f8fafc] p-3">
            <p className="text-xs font-black text-[#667085]">추천 제목</p>
            <h3 className="mt-2 text-base font-black text-[#071a3d]">
              {data.result.title}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.result.tags.map((tag) => (
              <span
                className="rounded-sm bg-[#eef3ff] px-2.5 py-1 text-xs font-bold text-[#2f4f9f]"
                key={tag}
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="rounded-sm border border-[#d8deea] bg-[#fbfcfd] p-3">
            <p className="text-xs font-black text-[#667085]">리뷰 초안</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#202632]">
              {data.result.draft}
            </p>
          </div>

          {onApplyDraft ? (
            <div>
              <button
                className="community-button-primary w-full"
                onClick={handleApplyDraft}
                type="button"
              >
                작성 폼에 초안 적용
              </button>
              {applyMessage ? (
                <p className="mt-2 rounded-sm border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-sm text-[#166534]">
                  {applyMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          {data.result.checklist.length > 0 ? (
            <div className="rounded-sm border border-[#d8deea] bg-white p-3">
              <p className="text-xs font-black text-[#667085]">보완 체크</p>
              <ul className="mt-2 grid gap-1 text-sm leading-6 text-[#667085]">
                {data.result.checklist.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.result.steps.length > 0 ? (
            <div className="rounded-sm border border-[#d8deea] bg-white p-3">
              <p className="text-xs font-black text-[#667085]">작성 과정</p>
              <div className="mt-2 grid gap-2">
                {data.result.steps.map((step) => (
                  <div
                    className="rounded-sm border border-[#edf1f7] bg-[#f8fafc] px-3 py-2 text-xs leading-5 text-[#667085]"
                    key={`${step.iteration}-${step.toolName}-${step.summary}`}
                  >
                    <span className="font-bold text-[#202632]">
                      {getStepLabel(step)}
                    </span>
                    <p className="mt-1">{step.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.result.sources.length > 0 ? (
            <div className="rounded-sm border border-[#d8deea] bg-white p-3">
              <p className="text-xs font-black text-[#667085]">참고 출처</p>
              <div className="mt-2 grid gap-2">
                {data.result.sources.map((source) => (
                  <a
                    className="rounded-sm border border-[#edf1f7] bg-[#f8fafc] px-3 py-2 text-sm hover:border-[#2f4f9f]"
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

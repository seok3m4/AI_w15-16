"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type AssistantSource = {
  title: string;
  url: string;
  source?: string;
};

type AssistantStep = {
  toolName: string;
  status: "success" | "error" | "skipped";
  summary: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
  steps?: AssistantStep[];
};

type AssistantResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: {
    answer: string;
    sources: AssistantSource[];
    steps: AssistantStep[];
  };
};

type BoardAssistantPanelProps = {
  selectedTeam: string;
};

const quickQuestions = [
  "오늘 경기 결과 알려줘",
  "KIA 관련 글 요약해줘",
  "기록실 타자 홈런 순위 알려줘",
  "6월 14일 경기 리뷰 포인트 알려줘",
];

function getStepLabel(step: AssistantStep): string {
  if (step.toolName === "search_board_posts") {
    return "게시글";
  }

  if (step.toolName === "fetch_board_overview") {
    return "인기/최신";
  }

  if (step.toolName === "get_kbo_games") {
    return "경기방";
  }

  if (step.toolName === "search_baseball_news") {
    return "뉴스";
  }

  if (step.toolName === "brief_external_url") {
    return "URL";
  }

  if (step.toolName === "fetch_kbo_standings") {
    return "순위";
  }

  if (step.toolName === "fetch_player_records") {
    return "기록실";
  }

  if (step.toolName === "search_player_record") {
    return "선수검색";
  }

  return "정보";
}

export function BoardAssistantPanel({ selectedTeam }: BoardAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "궁금한 경기, 팀, 선수 기록, 뉴스 링크를 물어보세요. 게시글, 순위표, 기록실, 경기방 정보를 같이 찾아볼게요.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleSteps = useMemo(() => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.steps);

    return (lastAssistantMessage?.steps ?? []).filter(
      (step) => step.status === "success",
    );
  }, [messages]);

  async function submitQuestion(nextQuestion: string) {
    const trimmedQuestion = nextQuestion.trim();

    if (!trimmedQuestion || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmedQuestion,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setQuestion("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/agent/board-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          question: trimmedQuestion,
          selectedTeam,
          messages: messages
            .filter(
              (message) =>
                message.role === "user" || message.role === "assistant",
            )
            .slice(-6)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await response.json()) as AssistantResponse;

      if (!response.ok || !data.result) {
        throw new Error(data.message ?? "답변을 만들지 못했습니다.");
      }

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.result.answer,
          sources: data.result.sources,
          steps: data.result.steps,
        },
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "답변을 만들지 못했습니다.",
        },
      ]);
    } finally {
      setIsLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(question);
  }

  return (
    <section className="community-panel">
      <div className="community-panel-header">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-[#1f3470]">야구 도우미</h2>
            <p className="mt-0.5 text-[11px] text-[#667085]">
              경기, 뉴스, 기록 질문
            </p>
          </div>
          {selectedTeam ? (
            <span className="community-chip community-chip-link px-1.5 py-0.5 text-[11px]">
              {selectedTeam}
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-b border-[#edf1f7] bg-[#f8fafc] px-3 py-2 text-[11px] font-bold text-[#667085]">
        게시글, 순위표, 기록실, 경기방 참고
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto bg-[#f8fafc] px-3 py-3">
        {messages.map((message, index) => (
          <div
            className={
              message.role === "user"
                ? "ml-6 rounded-sm bg-[#2f4f9f] px-3 py-2 text-xs font-bold leading-5 text-white"
                : "mr-3 rounded-sm border border-[#d8dfeb] bg-white px-3 py-2 text-xs leading-5 text-[#202632]"
            }
            key={`${message.role}-${index}`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.sources && message.sources.length > 0 ? (
              <div className="mt-2 border-t border-[#edf1f7] pt-2">
                <p className="mb-1 text-[11px] font-black text-[#667085]">
                  참고한 정보
                </p>
                <div className="space-y-1">
                  {message.sources.slice(0, 3).map((source) => (
                    <a
                      className="block truncate text-[11px] font-bold text-[#2f4f9f] hover:underline"
                      href={source.url}
                      key={source.url}
                      rel="noreferrer"
                      target={source.url.startsWith("/") ? undefined : "_blank"}
                    >
                      {source.source ? `[${source.source}] ` : ""}
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {isLoading ? (
          <div className="mr-3 rounded-sm border border-[#d8dfeb] bg-white px-3 py-2 text-xs font-bold text-[#667085]">
            정보를 찾는 중입니다...
          </div>
        ) : null}
      </div>

      {visibleSteps.length > 0 ? (
        <div className="flex flex-wrap gap-1 border-t border-[#edf1f7] px-3 py-2">
          {visibleSteps.slice(0, 4).map((step) => (
            <span
              className="community-chip community-chip-link px-1.5 py-0.5 text-[11px]"
              key={`${step.toolName}-${step.summary}`}
              title={step.summary}
            >
              {getStepLabel(step)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="border-t border-[#edf1f7] px-3 py-3">
        <p className="mb-2 text-[11px] font-black text-[#667085]">바로 물어보기</p>
        <div className="mb-3 grid gap-1.5">
          {quickQuestions.map((quickQuestion) => (
            <button
              className="rounded-sm border border-[#cfd8e6] bg-white px-2 py-1 text-left text-[11px] font-bold text-[#344054] hover:border-[#2f4f9f] hover:text-[#1f3470] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              key={quickQuestion}
              onClick={() => void submitQuestion(quickQuestion)}
              type="button"
            >
              {quickQuestion}
            </button>
          ))}
        </div>

        <form className="flex gap-2" onSubmit={handleSubmit}>
          <input
            className="community-input min-w-0 flex-1 text-xs"
            disabled={isLoading}
            maxLength={500}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="팀, 날짜, 뉴스 링크 입력"
            ref={inputRef}
            type="text"
            value={question}
          />
          <button
            className="community-button-primary shrink-0 px-3 text-xs"
            disabled={isLoading || question.trim().length < 2}
            type="submit"
          >
            질문
          </button>
        </form>
      </div>
    </section>
  );
}

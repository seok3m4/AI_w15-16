"use client";

import { useEffect, useState } from "react";

import {
  type KboGame,
  getScoreText,
  getStatusLabel,
} from "@/lib/kbo/game";

type GamecastItem = {
  key: string;
  createdAt: string;
  title: string;
  description: string;
};

type RelayEvent = {
  id: string;
  text: string;
  pitchText: string;
  countText: string;
  baseText: string;
};

type RelayGroup = {
  id: string;
  inning: number | null;
  half: string;
  title: string;
  events: RelayEvent[];
};

type RelayResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: {
    gameId: string;
    selectedInning: number | null;
    source: string;
    groups: RelayGroup[];
  };
};

type RelayState = {
  requestKey: string;
  response: RelayResponse;
};

type LiveGamecastPanelProps = {
  game: KboGame;
};

const INNING_OPTIONS = Array.from({ length: 9 }, (_, index) => index + 1);

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function getBaseLabels(game: KboGame): string[] {
  const liveState = game.liveState;

  if (!liveState) {
    return [];
  }

  return [
    liveState.firstBaseOccupied ? "1루" : "",
    liveState.secondBaseOccupied ? "2루" : "",
    liveState.thirdBaseOccupied ? "3루" : "",
  ].filter(Boolean);
}

function getInningText(game: KboGame): string {
  const liveState = game.liveState;

  if (!liveState?.inning) {
    return "";
  }

  return `${liveState.inning}회 ${liveState.inningHalf || ""}`.trim();
}

function getCountText(game: KboGame): string {
  const liveState = game.liveState;

  if (!liveState) {
    return "";
  }

  return [
    liveState.balls !== null ? `B ${liveState.balls}` : "",
    liveState.strikes !== null ? `S ${liveState.strikes}` : "",
    liveState.outs !== null ? `O ${liveState.outs}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function getRunnerText(game: KboGame): string {
  if (!game.liveState) {
    return "";
  }

  const bases = getBaseLabels(game);

  return bases.length > 0 ? `주자 ${bases.join(", ")}` : "주자 없음";
}

function getCurrentPlayerText(game: KboGame): string {
  const liveState = game.liveState;

  if (!liveState) {
    return "";
  }

  return [
    liveState.awayCurrentPlayer
      ? `${game.awayTeam} ${liveState.awayCurrentPlayer.name}`
      : "",
    liveState.homeCurrentPlayer
      ? `${game.homeTeam} ${liveState.homeCurrentPlayer.name}`
      : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function getLiveSummaryText(game: KboGame): string[] {
  const summary = [getCurrentPlayerText(game), getRunnerText(game), getCountText(game)]
    .filter(Boolean);

  return summary;
}

function buildGamecastItems(game: KboGame): GamecastItem[] {
  const inningText = getInningText(game);
  const countText = getCountText(game);
  const runnerText = getRunnerText(game);
  const currentPlayerText = getCurrentPlayerText(game);
  const statusLabel = getStatusLabel(game.status);
  const createdAt = formatTime(new Date());
  const scoreLine = `${game.awayTeam} ${game.awayScore ?? "-"} : ${
    game.homeScore ?? "-"
  } ${game.homeTeam}`;

  if (game.status === "live") {
    return [
      {
        key: "live-score",
        createdAt,
        title: `${inningText || "경기 진행 중"} · ${scoreLine}`,
        description: "공식 GameCenter 스코어가 갱신되었습니다.",
      },
      {
        key: "live-count",
        createdAt,
        title: countText || "볼카운트 업데이트 대기",
        description: runnerText || "주자 상황 업데이트 대기",
      },
      currentPlayerText
        ? {
            key: "live-player",
            createdAt,
            title: "현재 선수 정보",
            description: currentPlayerText,
          }
        : null,
    ].filter((item): item is GamecastItem => Boolean(item));
  }

  if (game.status === "scheduled") {
    return [
      {
        key: "scheduled",
        createdAt,
        title: `${game.time || "시간 미정"} 경기 시작 예정`,
        description: `${game.awayTeam} vs ${game.homeTeam} · ${game.stadium || "구장 미정"}`,
      },
    ];
  }

  return [
    {
      key: "completed",
      createdAt,
      title: `${statusLabel} · ${getScoreText(game)}`,
      description: `${game.awayTeam} vs ${game.homeTeam} 경기가 종료되었습니다.`,
    },
  ];
}

function BaseIndicator({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={[
        "flex h-9 w-9 items-center justify-center rounded-sm border text-[11px] font-black",
        active
          ? "border-[#d71920] bg-[#d71920] text-white"
          : "border-[#c8d3df] bg-white text-[#94a3b8]",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export function LiveGamecastPanel({ game }: LiveGamecastPanelProps) {
  const [selectedInning, setSelectedInning] = useState<number | null>(null);
  const [relayState, setRelayState] = useState<RelayState | null>(null);
  const requestKey = `${game.gameId ?? ""}:${game.gameDate}:${
    selectedInning ?? "all"
  }`;
  const items = buildGamecastItems(game);
  const liveState = game.liveState;
  const liveSummary = getLiveSummaryText(game);
  const hasRelayResponse = relayState?.requestKey === requestKey;
  const relayGroups =
    hasRelayResponse
      ? relayState.response.result?.groups ?? []
      : [];
  const relaySource =
    hasRelayResponse
      ? relayState.response.result?.source
      : null;
  const relayMessage = hasRelayResponse ? relayState.response.message : "";

  useEffect(() => {
    if (!game.gameId) {
      return;
    }

    let isMounted = true;

    async function loadRelay() {
      try {
        const params = new URLSearchParams({
          gameId: game.gameId ?? "",
          date: game.gameDate,
          limit: selectedInning === null ? "8" : "20",
        });

        if (selectedInning !== null) {
          params.set("inning", String(selectedInning));
        }

        const response = await fetch(`/api/kbo/relay?${params}`, {
          cache: "no-store",
          credentials: "include",
        });
        const responseData = (await response.json()) as RelayResponse;

        if (isMounted) {
          setRelayState({
            requestKey,
            response: responseData,
          });
        }
      } catch {
        if (isMounted) {
          setRelayState({
            requestKey,
            response: {
              status: "unavailable",
              message: "문자중계를 불러오지 못했습니다.",
            },
          });
        }
      }
    }

    void loadRelay();
    const intervalId =
      game.status === "live"
        ? window.setInterval(() => void loadRelay(), 15_000)
        : null;

    return () => {
      isMounted = false;

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [game.gameDate, game.gameId, game.status, requestKey, selectedInning]);

  return (
    <section className="community-panel mt-4">
      <div className="community-title-bar flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black">실시간 중계</h2>
          <p className="mt-1 text-xs text-white/70">
            경기 진행 중이면 자동으로 갱신됩니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {relaySource ? (
            <a
              className="community-chip community-chip-inverse"
              href={relaySource}
              rel="noreferrer"
              target="_blank"
            >
              원문
            </a>
          ) : null}
          <span
            className={[
              "community-chip w-fit",
              game.status === "live"
                ? "community-chip-accent"
                : "community-chip-inverse",
            ].join(" ")}
          >
            {game.status === "live" ? "LIVE" : getStatusLabel(game.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="border-b border-[#d8deea] bg-[#f6f8fc] p-3 md:border-b-0 md:border-r">
          <div className="community-subpanel bg-white p-3 text-center">
            <p className="text-xs font-black text-[#667085]">
              {getInningText(game) || getStatusLabel(game.status)}
            </p>
            <p className="mt-2 text-xl font-black text-[#202632]">
              {getScoreText(game)}
            </p>
            {getCountText(game) ? (
              <p className="mt-2 text-xs font-black text-[#d71920]">
                {getCountText(game)}
              </p>
            ) : null}
          </div>

          <div className="community-subpanel mt-3 bg-white p-3">
            <p className="text-xs font-black text-[#667085]">루상 상황</p>
            <div className="mt-2 flex justify-center gap-2">
              <BaseIndicator
                active={Boolean(liveState?.firstBaseOccupied)}
                label="1B"
              />
              <BaseIndicator
                active={Boolean(liveState?.secondBaseOccupied)}
                label="2B"
              />
              <BaseIndicator
                active={Boolean(liveState?.thirdBaseOccupied)}
                label="3B"
              />
            </div>
            <p className="mt-2 text-center text-xs font-bold text-[#667085]">
              {getRunnerText(game) || "경기 상황 대기"}
            </p>
          </div>

          {liveSummary.length > 0 ? (
            <div className="community-subpanel mt-3 bg-white p-3">
              <p className="text-xs font-black text-[#667085]">현재 흐름</p>
              <div className="mt-2 grid gap-1.5">
                {liveSummary.map((item) => (
                  <p className="text-xs font-bold leading-5 text-[#202632]" key={item}>
                    {item}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="border-b border-[#edf1f7] bg-[#fbfcff] px-3 py-3">
            <p className="text-xs font-black text-[#667085]">이닝 선택</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                className={[
                  "h-8 rounded-sm border px-2.5 text-xs font-black",
                  selectedInning === null
                    ? "border-[#2f4f9f] bg-[#2f4f9f] text-white"
                    : "border-[#c8d3df] bg-white text-[#344054] hover:border-[#2f4f9f]",
                ].join(" ")}
                onClick={() => setSelectedInning(null)}
                type="button"
              >
                전체
              </button>
              {INNING_OPTIONS.map((inning) => (
                <button
                  className={[
                    "h-8 rounded-sm border px-2.5 text-xs font-black",
                    selectedInning === inning
                      ? "border-[#2f4f9f] bg-[#2f4f9f] text-white"
                      : "border-[#c8d3df] bg-white text-[#344054] hover:border-[#2f4f9f]",
                  ].join(" ")}
                  key={inning}
                  onClick={() => setSelectedInning(inning)}
                  type="button"
                >
                  {inning}회
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#edf1f7] lg:max-h-[720px] lg:overflow-y-auto">
            {relayGroups.length > 0 ? (
              relayGroups.map((group) => (
                <div className="px-3 py-3" key={group.id}>
                  <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                    <span className="text-xs font-black text-[#d71920]">
                      {group.inning ? `${group.inning}회${group.half}` : "중계"}
                    </span>
                    <div className="min-w-0">
                      {group.title ? (
                        <p className="text-sm font-black text-[#202632]">
                          {group.title}
                        </p>
                      ) : null}
                      <div className="mt-2 grid gap-1.5">
                        {group.events.map((event) => (
                          <div
                            className="community-subpanel bg-[#fbfcff] px-3 py-2"
                            key={event.id}
                          >
                            <p className="text-sm font-bold leading-6 text-[#202632]">
                              {event.text}
                            </p>
                            {[event.pitchText, event.countText, event.baseText]
                              .filter(Boolean)
                              .length > 0 ? (
                              <p className="mt-1 text-xs font-bold text-[#667085]">
                                {[event.pitchText, event.countText, event.baseText]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : hasRelayResponse ? (
              <div className="px-3 py-6 text-center text-sm font-bold text-[#667085]">
                {relayMessage ||
                  (selectedInning === null
                    ? "문자중계 내역이 아직 없습니다."
                    : `${selectedInning}회 문자중계 내역이 없습니다.`)}
              </div>
            ) : (
              items.map((item) => (
                <div
                  className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 px-3 py-3"
                  key={item.key}
                >
                  <span className="text-xs font-black text-[#667085]">
                    {item.createdAt}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#202632]">
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-sm leading-6 text-[#667085]">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

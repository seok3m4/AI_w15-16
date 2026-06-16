"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  KboBoxscoreResult,
  KboHitterRecord,
  KboLineScoreTeam,
  KboPitcherRecord,
} from "@/lib/kbo/boxscore";
import type { KboGame } from "@/lib/kbo/game";

type BoxscoreTab = "score" | "hitters" | "pitchers";

type KboBoxscoreResponse = {
  status: "ready" | "unavailable";
  message?: string;
  result?: KboBoxscoreResult;
};

type KboBoxscorePanelProps = {
  game: KboGame;
};

const TABS: { id: BoxscoreTab; label: string }[] = [
  { id: "score", label: "박스스코어" },
  { id: "hitters", label: "타자 기록" },
  { id: "pitchers", label: "투수 기록" },
];

function EmptyState({ message }: { message: string }) {
  return (
    <p className="px-3 py-5 text-center text-sm font-bold text-[#667085]">
      {message}
    </p>
  );
}

function ScoreTeamRow({
  innings,
  team,
}: {
  innings: string[];
  team: KboLineScoreTeam;
}) {
  return (
    <tr className="border-t border-[#edf1f7]">
      <th className="sticky left-0 bg-white px-3 py-2 text-left font-black text-[#1f3470]">
        {team.team}
      </th>
      {innings.map((inning, index) => (
        <td
          className="px-2 py-2 text-center font-bold text-[#202632]"
          key={`${team.team}-${inning}`}
        >
          {team.runsByInning[index] || "-"}
        </td>
      ))}
      <td className="bg-[#f8fafc] px-2 py-2 text-center font-black text-[#d71920]">
        {team.runs || "-"}
      </td>
      <td className="bg-[#f8fafc] px-2 py-2 text-center font-bold text-[#202632]">
        {team.hits || "-"}
      </td>
      <td className="bg-[#f8fafc] px-2 py-2 text-center font-bold text-[#202632]">
        {team.errors || "-"}
      </td>
      <td className="bg-[#f8fafc] px-2 py-2 text-center font-bold text-[#202632]">
        {team.balls || "-"}
      </td>
    </tr>
  );
}

function BoxscoreTable({ result }: { result: KboBoxscoreResult }) {
  const lineScore = result.lineScore;

  if (!lineScore) {
    return <EmptyState message="박스스코어를 아직 불러오지 못했습니다." />;
  }

  return (
    <div className="p-3">
      <div className="overflow-x-auto rounded-sm border border-[#d8deea] bg-white">
        <table className="min-w-[720px] w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#f6f8fc] text-[#667085]">
              <th className="sticky left-0 bg-[#f6f8fc] px-3 py-2 text-left font-black">
                팀
              </th>
              {lineScore.innings.map((inning) => (
                <th className="px-2 py-2 text-center font-black" key={inning}>
                  {inning}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-black text-[#d71920]">
                R
              </th>
              <th className="px-2 py-2 text-center font-black">H</th>
              <th className="px-2 py-2 text-center font-black">E</th>
              <th className="px-2 py-2 text-center font-black">B</th>
            </tr>
          </thead>
          <tbody>
            <ScoreTeamRow innings={lineScore.innings} team={lineScore.away} />
            <ScoreTeamRow innings={lineScore.innings} team={lineScore.home} />
          </tbody>
        </table>
      </div>

      {result.etcRecords.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {result.etcRecords.map((record) => (
            <div
              className="community-subpanel bg-[#fbfcff] px-3 py-2"
              key={`${record.label}-${record.value}`}
            >
              <p className="text-xs font-black text-[#667085]">
                {record.label}
              </p>
              <p className="mt-1 text-sm font-bold leading-5 text-[#202632]">
                {record.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HitterRecordRow({ row }: { row: KboHitterRecord }) {
  return (
    <tr
      className={[
        "border-t border-[#edf1f7]",
        row.isTotal ? "bg-[#f8fafc] font-black" : "bg-white",
      ].join(" ")}
    >
      <td className="px-2 py-2 text-center text-[#667085]">
        {row.order || "-"}
      </td>
      <td className="px-2 py-2 text-center text-[#667085]">
        {row.position || "-"}
      </td>
      <td className="px-3 py-2 font-black text-[#202632]">{row.name}</td>
      <td className="px-2 py-2 text-center">{row.atBats || "-"}</td>
      <td className="px-2 py-2 text-center font-black text-[#d71920]">
        {row.hits || "-"}
      </td>
      <td className="px-2 py-2 text-center">{row.rbi || "-"}</td>
      <td className="px-2 py-2 text-center">{row.runs || "-"}</td>
      <td className="px-2 py-2 text-center">{row.average || "-"}</td>
    </tr>
  );
}

function HitterTable({ result }: { result: KboBoxscoreResult }) {
  const hasRows = result.hitters.some((team) => team.rows.length > 0);

  if (!hasRows) {
    return <EmptyState message="타자 기록을 아직 불러오지 못했습니다." />;
  }

  return (
    <div className="grid gap-3 p-3">
      {result.hitters.map((team) => (
        <div
          className="overflow-hidden rounded-sm border border-[#d8deea] bg-white"
          key={team.team}
        >
          <div className="border-b border-[#edf1f7] bg-[#f6f8fc] px-3 py-2">
            <h3 className="text-sm font-black text-[#1f3470]">{team.team}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#fbfcff] text-[#667085]">
                  <th className="px-2 py-2 text-center font-black">타순</th>
                  <th className="px-2 py-2 text-center font-black">수비</th>
                  <th className="px-3 py-2 text-left font-black">선수</th>
                  <th className="px-2 py-2 text-center font-black">타수</th>
                  <th className="px-2 py-2 text-center font-black">안타</th>
                  <th className="px-2 py-2 text-center font-black">타점</th>
                  <th className="px-2 py-2 text-center font-black">득점</th>
                  <th className="px-2 py-2 text-center font-black">타율</th>
                </tr>
              </thead>
              <tbody>
                {team.rows.map((row, index) => (
                  <HitterRecordRow
                    key={`${team.team}-${row.name}-${index}`}
                    row={row}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function PitcherRecordRow({ row }: { row: KboPitcherRecord }) {
  return (
    <tr className="border-t border-[#edf1f7] bg-white">
      <td className="px-3 py-2 font-black text-[#202632]">{row.name}</td>
      <td className="px-2 py-2 text-center text-[#667085]">
        {row.appearance || "-"}
      </td>
      <td className="px-2 py-2 text-center font-black text-[#d71920]">
        {row.result || "-"}
      </td>
      <td className="px-2 py-2 text-center">{row.innings || "-"}</td>
      <td className="px-2 py-2 text-center">{row.pitches || "-"}</td>
      <td className="px-2 py-2 text-center">{row.hits || "-"}</td>
      <td className="px-2 py-2 text-center">{row.homeRuns || "-"}</td>
      <td className="px-2 py-2 text-center">{row.walks || "-"}</td>
      <td className="px-2 py-2 text-center font-black text-[#1f3470]">
        {row.strikeouts || "-"}
      </td>
      <td className="px-2 py-2 text-center">{row.runs || "-"}</td>
      <td className="px-2 py-2 text-center">{row.earnedRuns || "-"}</td>
      <td className="px-2 py-2 text-center">{row.era || "-"}</td>
    </tr>
  );
}

function PitcherTable({ result }: { result: KboBoxscoreResult }) {
  const hasRows = result.pitchers.some((team) => team.rows.length > 0);

  if (!hasRows) {
    return <EmptyState message="투수 기록을 아직 불러오지 못했습니다." />;
  }

  return (
    <div className="grid gap-3 p-3">
      {result.pitchers.map((team) => (
        <div
          className="overflow-hidden rounded-sm border border-[#d8deea] bg-white"
          key={team.team}
        >
          <div className="border-b border-[#edf1f7] bg-[#f6f8fc] px-3 py-2">
            <h3 className="text-sm font-black text-[#1f3470]">{team.team}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#fbfcff] text-[#667085]">
                  <th className="px-3 py-2 text-left font-black">선수</th>
                  <th className="px-2 py-2 text-center font-black">등판</th>
                  <th className="px-2 py-2 text-center font-black">결과</th>
                  <th className="px-2 py-2 text-center font-black">이닝</th>
                  <th className="px-2 py-2 text-center font-black">투구</th>
                  <th className="px-2 py-2 text-center font-black">피안타</th>
                  <th className="px-2 py-2 text-center font-black">피홈런</th>
                  <th className="px-2 py-2 text-center font-black">4사구</th>
                  <th className="px-2 py-2 text-center font-black">삼진</th>
                  <th className="px-2 py-2 text-center font-black">실점</th>
                  <th className="px-2 py-2 text-center font-black">자책</th>
                  <th className="px-2 py-2 text-center font-black">ERA</th>
                </tr>
              </thead>
              <tbody>
                {team.rows.map((row, index) => (
                  <PitcherRecordRow
                    key={`${team.team}-${row.name}-${index}`}
                    row={row}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export function KboBoxscorePanel({ game }: KboBoxscorePanelProps) {
  const [selectedTab, setSelectedTab] = useState<BoxscoreTab>("score");
  const [data, setData] = useState<KboBoxscoreResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const queryString = useMemo(() => {
    if (!game.gameId) {
      return "";
    }

    return new URLSearchParams({
      gameId: game.gameId,
      gameDate: game.gameDate,
      awayTeam: game.awayTeam,
      homeTeam: game.homeTeam,
    }).toString();
  }, [game.awayTeam, game.gameDate, game.gameId, game.homeTeam]);

  useEffect(() => {
    if (!queryString) {
      return;
    }

    let isMounted = true;

    async function loadBoxscore() {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/kbo/boxscore?${queryString}`, {
          cache: "no-store",
          credentials: "include",
        });
        const responseData = (await response.json()) as KboBoxscoreResponse;

        if (isMounted) {
          setData(responseData);
        }
      } catch {
        if (isMounted) {
          setData({
            status: "unavailable",
            message: "박스스코어를 불러오지 못했습니다.",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBoxscore();

    return () => {
      isMounted = false;
    };
  }, [queryString]);

  return (
    <section className="community-panel mt-4">
      <div className="community-panel-header flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-[#1f3470]">
            경기 기록
          </h2>
          <p className="mt-1 text-xs text-[#667085]">
            공식 GameCenter 기준 박스스코어와 선수별 기록
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data?.result?.source ? (
            <a
              className="community-chip community-chip-link shrink-0 px-2"
              href={data.result.source}
              rel="noreferrer"
              target="_blank"
            >
              원문
            </a>
          ) : null}
          {TABS.map((tab) => (
            <button
              className={[
                "h-8 rounded-sm border px-3 text-xs font-black",
                selectedTab === tab.id
                  ? "border-[#2f4f9f] bg-[#2f4f9f] text-white"
                  : "border-[#c8d3df] bg-white text-[#344054] hover:border-[#2f4f9f]",
              ].join(" ")}
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <EmptyState message="경기 기록을 불러오는 중입니다." />
      ) : null}

      {!isLoading && !queryString ? (
        <EmptyState message="경기 기록 조회에 필요한 gameId가 없습니다." />
      ) : null}

      {!isLoading && data?.message ? (
        <EmptyState message={data.message} />
      ) : null}

      {!isLoading && data?.result && selectedTab === "score" ? (
        <BoxscoreTable result={data.result} />
      ) : null}

      {!isLoading && data?.result && selectedTab === "hitters" ? (
        <HitterTable result={data.result} />
      ) : null}

      {!isLoading && data?.result && selectedTab === "pitchers" ? (
        <PitcherTable result={data.result} />
      ) : null}
    </section>
  );
}

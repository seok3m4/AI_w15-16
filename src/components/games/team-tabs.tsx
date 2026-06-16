"use client";

import { KBO_TEAMS } from "@/lib/kbo/game";

type TeamTabsProps = {
  selectedTeam: string;
  onSelectTeam: (teamName: string) => void;
};

export function TeamTabs({ selectedTeam, onSelectTeam }: TeamTabsProps) {
  return (
    <div className="community-panel">
      <div className="community-panel-header">
        <div>
          <h2 className="text-sm font-black text-[#1f3470]">팀 게시판</h2>
        </div>
        {selectedTeam ? (
          <button
            className="text-xs font-bold text-[#667085] hover:text-[#2f4f9f] hover:underline"
            onClick={() => onSelectTeam("")}
            type="button"
          >
            전체로
          </button>
        ) : (
          <span className="text-[11px] font-black text-[#667085]">전체 팀</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5 px-3 py-3">
        <button
          className={
            selectedTeam
              ? "community-button-secondary community-button-compact col-span-2 w-full"
              : "community-button-primary community-button-compact col-span-2 w-full"
          }
          onClick={() => onSelectTeam("")}
          type="button"
        >
          전체
        </button>
        {KBO_TEAMS.map((teamName) => {
          const isSelected = selectedTeam === teamName;

          return (
            <button
              className={
                isSelected
                  ? "community-button-primary community-button-compact w-full"
                  : "community-button-secondary community-button-compact w-full"
              }
              key={teamName}
              onClick={() => onSelectTeam(isSelected ? "" : teamName)}
              type="button"
            >
              {teamName}
            </button>
          );
        })}
      </div>
    </div>
  );
}

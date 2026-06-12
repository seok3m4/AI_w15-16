"use client";

import { KBO_TEAMS } from "@/lib/kbo/game";

type TeamTabsProps = {
  selectedTeam: string;
  onSelectTeam: (teamName: string) => void;
};

export function TeamTabs({ selectedTeam, onSelectTeam }: TeamTabsProps) {
  return (
    <div className="overflow-hidden rounded-sm border border-[#b9c3d7] bg-white">
      <div className="flex items-center gap-1 overflow-x-auto px-3 py-2">
        <button
          className={
            selectedTeam
              ? "shrink-0 rounded-sm px-3 py-1.5 text-sm font-bold text-[#475569] hover:bg-[#eef3ff] hover:text-[#1f3470]"
              : "shrink-0 rounded-sm bg-[#2f4f9f] px-3 py-1.5 text-sm font-black text-white"
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
                  ? "shrink-0 rounded-sm bg-[#2f4f9f] px-3 py-1.5 text-sm font-black text-white"
                  : "shrink-0 rounded-sm px-3 py-1.5 text-sm font-bold text-[#475569] hover:bg-[#eef3ff] hover:text-[#1f3470]"
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

export type DraftTeamSortMode = "pickOrder" | "avgRank";

type SortableTeam = {
  pickOrder: number;
  stats: { avgRank: number | null };
};

export function sortDraftTeams<T extends SortableTeam>(
  teams: T[],
  mode: DraftTeamSortMode,
): T[] {
  const sorted = [...teams];
  if (mode === "avgRank") {
    return sorted.sort((a, b) => {
      const aRank = a.stats.avgRank;
      const bRank = b.stats.avgRank;
      if (aRank == null && bRank == null) return a.pickOrder - b.pickOrder;
      if (aRank == null) return 1;
      if (bRank == null) return -1;
      if (aRank !== bRank) return aRank - bRank;
      return a.pickOrder - b.pickOrder;
    });
  }
  return sorted.sort((a, b) => a.pickOrder - b.pickOrder);
}

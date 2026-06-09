export type DraftTeamSortMode = "pickOrder" | "avgRank";

type SortableTeam = {
  pickOrder: number;
  stats: { avgOverall: number | null };
};

export function sortDraftTeams<T extends SortableTeam>(
  teams: T[],
  mode: DraftTeamSortMode,
): T[] {
  const sorted = [...teams];
  if (mode === "avgRank") {
    return sorted.sort((a, b) => {
      const aCalc = a.stats.avgOverall;
      const bCalc = b.stats.avgOverall;
      if (aCalc == null && bCalc == null) return a.pickOrder - b.pickOrder;
      if (aCalc == null) return 1;
      if (bCalc == null) return -1;
      if (aCalc !== bCalc) return bCalc - aCalc;
      return a.pickOrder - b.pickOrder;
    });
  }
  return sorted.sort((a, b) => a.pickOrder - b.pickOrder);
}

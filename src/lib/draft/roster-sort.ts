export type DraftRosterSortMode = "pickOrder" | "calc" | "lastName";

type SortableRosterPlayer = {
  playerId: string;
  firstName: string;
  lastName: string;
  overall: number;
};

export function sortRosterPlayers<T extends SortableRosterPlayer>(
  roster: T[],
  mode: DraftRosterSortMode,
): T[] {
  if (mode === "pickOrder" || roster.length <= 1) {
    return roster;
  }

  const sorted = [...roster];
  if (mode === "lastName") {
    return sorted.sort((a, b) => {
      const last = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
      if (last !== 0) return last;
      const first = a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
      if (first !== 0) return first;
      return a.playerId.localeCompare(b.playerId);
    });
  }

  return sorted.sort((a, b) => {
    if (a.overall !== b.overall) return b.overall - a.overall;
    const last = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
    if (last !== 0) return last;
    return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
  });
}

export function parsePublicRosterSort(
  parsed: Partial<{ publicRosterSort?: string; publicTeamSort?: string }>,
): DraftRosterSortMode {
  if (
    parsed.publicRosterSort === "calc" ||
    parsed.publicRosterSort === "lastName" ||
    parsed.publicRosterSort === "pickOrder"
  ) {
    return parsed.publicRosterSort;
  }
  if (parsed.publicTeamSort === "avgRank") return "calc";
  return "pickOrder";
}

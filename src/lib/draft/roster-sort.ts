export type DraftRosterSortMode = "pickOrder" | "calc" | "lastName";
export type SortDirection = "asc" | "desc";

type SortableRosterPlayer = {
  playerId: string;
  firstName: string;
  lastName: string;
  overall: number;
};

export function parseSortDirection(raw: string | null | undefined): SortDirection {
  return raw === "asc" ? "asc" : "desc";
}

export function sortRosterPlayers<T extends SortableRosterPlayer>(
  roster: T[],
  mode: DraftRosterSortMode,
  direction: SortDirection = "desc",
): T[] {
  if (roster.length <= 1) {
    return roster;
  }

  if (mode === "pickOrder") {
    return direction === "asc" ? [...roster] : [...roster].reverse();
  }

  const sorted = [...roster];
  if (mode === "lastName") {
    sorted.sort((a, b) => {
      const last = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
      if (last !== 0) return last;
      const first = a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
      if (first !== 0) return first;
      return a.playerId.localeCompare(b.playerId);
    });
    return direction === "asc" ? sorted : sorted.reverse();
  }

  sorted.sort((a, b) => {
    if (a.overall !== b.overall) return b.overall - a.overall;
    const last = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
    if (last !== 0) return last;
    return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
  });
  // Default calc sort is descending (high → low); asc flips it.
  return direction === "desc" ? sorted : sorted.reverse();
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

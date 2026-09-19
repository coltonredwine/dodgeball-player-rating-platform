import type { PoolPlayerSection } from "@/lib/draft/pool-sections";
import type { SortDirection } from "@/lib/draft/roster-sort";

export type CaptainPoolSortField = "overall" | "offensive" | "defensive" | "psych";

export const CAPTAIN_POOL_SORT_OPTIONS: { value: CaptainPoolSortField; label: string }[] = [
  { value: "overall", label: "Overall" },
  { value: "offensive", label: "OFF" },
  { value: "defensive", label: "DEF" },
  { value: "psych", label: "PSY" },
];

export const DEFAULT_CAPTAIN_POOL_SORT: CaptainPoolSortField = "overall";

type SortablePoolPlayer = {
  firstName: string;
  lastName: string;
  scores: {
    rank: number;
    overall: number;
    displayOffensive: number;
    displayDefensive: number;
    displayPsych: number;
  } | null;
};

function scoreForField(player: SortablePoolPlayer, field: CaptainPoolSortField): number {
  if (!player.scores) return 0;
  switch (field) {
    case "overall":
      return player.scores.overall;
    case "offensive":
      return player.scores.displayOffensive;
    case "defensive":
      return player.scores.displayDefensive;
    case "psych":
      return player.scores.displayPsych;
  }
}

function compareNames(a: SortablePoolPlayer, b: SortablePoolPlayer): number {
  const lastName = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
  if (lastName !== 0) return lastName;
  return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
}

function comparePoolPlayersByScore<T extends SortablePoolPlayer>(
  a: T,
  b: T,
  field: CaptainPoolSortField,
): number {
  const diff = scoreForField(b, field) - scoreForField(a, field);
  if (diff !== 0) return diff;
  return compareNames(a, b);
}

/** Higher rank number = better. Unranked (0 / missing) sorts last regardless of direction. */
function compareByRank(
  a: SortablePoolPlayer,
  b: SortablePoolPlayer,
  direction: SortDirection,
): number {
  const rankA = a.scores?.rank ?? 0;
  const rankB = b.scores?.rank ?? 0;
  if (rankA === 0 && rankB === 0) return 0;
  if (rankA === 0) return 1;
  if (rankB === 0) return -1;
  return direction === "desc" ? rankB - rankA : rankA - rankB;
}

export function sortPoolPlayersByField<T extends SortablePoolPlayer>(
  players: T[],
  field: CaptainPoolSortField,
  direction: SortDirection = "desc",
): T[] {
  const sorted = [...players].sort((a, b) => comparePoolPlayersByScore(a, b, field));
  return direction === "desc" ? sorted : sorted.reverse();
}

/**
 * Flat pool: order by rank first (desc = 5→1, asc = 1→5), then by score within ties.
 * Unranked always last. Saved bookmarks are not handled here — caller filters them.
 */
export function sortPoolPlayersByRankThenField<T extends SortablePoolPlayer>(
  players: T[],
  field: CaptainPoolSortField,
  rankDirection: SortDirection = "desc",
  scoreDirection: SortDirection = "desc",
): T[] {
  return [...players].sort((a, b) => {
    const rankCmp = compareByRank(a, b, rankDirection);
    if (rankCmp !== 0) return rankCmp;

    const scoreCmp = comparePoolPlayersByScore(a, b, field);
    return scoreDirection === "desc" ? scoreCmp : -scoreCmp;
  });
}

/**
 * Sort players within rank sections, and order rank sections by direction.
 * Descending puts best ranks first (5→1). Ascending puts rank 1 at the top.
 * Saved bookmarks stay first. Unranked (0) always last among ranked sections.
 */
export function sortPoolSectionsByField<T extends SortablePoolPlayer>(
  sections: PoolPlayerSection<T>[],
  field: CaptainPoolSortField,
  scoreDirection: SortDirection = "desc",
  rankDirection: SortDirection = "desc",
): PoolPlayerSection<T>[] {
  const saved: PoolPlayerSection<T>[] = [];
  const ranked: PoolPlayerSection<T>[] = [];

  for (const section of sections) {
    if (section.kind === "saved") {
      saved.push(section);
      continue;
    }
    ranked.push({
      ...section,
      players: sortPoolPlayersByField(section.players, field, scoreDirection),
    });
  }

  ranked.sort((a, b) => {
    if (a.kind !== "rank" || b.kind !== "rank") return 0;
    if (a.rank === 0) return 1;
    if (b.rank === 0) return -1;
    // desc: 5→1; asc: 1→5
    return rankDirection === "desc" ? b.rank - a.rank : a.rank - b.rank;
  });

  return [...saved, ...ranked];
}

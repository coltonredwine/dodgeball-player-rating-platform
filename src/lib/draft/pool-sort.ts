import type { PoolPlayerSection } from "@/lib/draft/pool-sections";

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

function comparePoolPlayers<T extends SortablePoolPlayer>(
  a: T,
  b: T,
  field: CaptainPoolSortField,
): number {
  const diff = scoreForField(b, field) - scoreForField(a, field);
  if (diff !== 0) return diff;

  const lastName = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
  if (lastName !== 0) return lastName;
  return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
}

export function sortPoolPlayersByField<T extends SortablePoolPlayer>(
  players: T[],
  field: CaptainPoolSortField,
  direction: "asc" | "desc" = "desc",
): T[] {
  const sorted = [...players].sort((a, b) => comparePoolPlayers(a, b, field));
  return direction === "desc" ? sorted : sorted.reverse();
}

/** Sort players within rank sections, and order rank sections by direction.
 * Descending keeps high ranks first (5→1). Ascending puts rank 1 at the top.
 * Saved bookmarks stay first. */
export function sortPoolSectionsByField<T extends SortablePoolPlayer>(
  sections: PoolPlayerSection<T>[],
  field: CaptainPoolSortField,
  direction: "asc" | "desc" = "desc",
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
      players: sortPoolPlayersByField(section.players, field, direction),
    });
  }

  ranked.sort((a, b) => {
    if (a.kind !== "rank" || b.kind !== "rank") return 0;
    // Unranked (0) always last.
    if (a.rank === 0) return 1;
    if (b.rank === 0) return -1;
    // Descending puts rank 1 at the top; ascending keeps high ranks first (5→1).
    return direction === "desc" ? a.rank - b.rank : b.rank - a.rank;
  });

  return [...saved, ...ranked];
}

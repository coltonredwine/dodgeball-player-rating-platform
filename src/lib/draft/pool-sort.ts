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
): T[] {
  return [...players].sort((a, b) => comparePoolPlayers(a, b, field));
}

/** Sort players within rank sections; saved bookmarks keep their bookmark order. */
export function sortPoolSectionsByField<T extends SortablePoolPlayer>(
  sections: PoolPlayerSection<T>[],
  field: CaptainPoolSortField,
): PoolPlayerSection<T>[] {
  return sections.map((section) => {
    if (section.kind === "saved") return section;
    return {
      ...section,
      players: sortPoolPlayersByField(section.players, field),
    };
  });
}

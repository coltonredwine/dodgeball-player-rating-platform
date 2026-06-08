export type PlayerSortField = "rank" | "calculation" | "firstName" | "lastName";

export type DraftSortSettings = {
  primarySort: PlayerSortField;
  secondarySort: PlayerSortField;
};

export const PLAYER_SORT_OPTIONS: { value: PlayerSortField; label: string }[] = [
  { value: "rank", label: "Rank" },
  { value: "calculation", label: "Calculation (CALC)" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
];

export const DEFAULT_SORT_SETTINGS: DraftSortSettings = {
  primarySort: "rank",
  secondarySort: "lastName",
};

type SortablePlayer = {
  firstName: string;
  lastName: string;
  scores: { rank: number; overall: number } | null;
};

function compareByField(a: SortablePlayer, b: SortablePlayer, field: PlayerSortField): number {
  switch (field) {
    case "rank":
      return (b.scores?.rank ?? 0) - (a.scores?.rank ?? 0);
    case "calculation":
      return (b.scores?.overall ?? 0) - (a.scores?.overall ?? 0);
    case "firstName":
      return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
    case "lastName":
      return a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
  }
}

export function sortDraftPlayers<T extends SortablePlayer>(
  players: T[],
  settings: DraftSortSettings,
): T[] {
  return [...players].sort((a, b) => {
    const primary = compareByField(a, b, settings.primarySort);
    if (primary !== 0) return primary;

    if (settings.secondarySort !== settings.primarySort) {
      const secondary = compareByField(a, b, settings.secondarySort);
      if (secondary !== 0) return secondary;
    }

    const lastName = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
    if (lastName !== 0) return lastName;
    return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
  });
}

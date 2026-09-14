import { MetricField } from "@/lib/constants";
import {
  DEFAULT_SORT_SETTINGS,
  PlayerSortField,
} from "@/lib/draft/sort";
import { parsePublicRosterSort, parseSortDirection, type DraftRosterSortMode, type SortDirection } from "@/lib/draft/roster-sort";
import {
  parseRosterAverageMetric,
  type RosterAverageMetric,
} from "@/lib/draft/roster-average";

/** ColorBrewer Set1-9 */
export const TEAM_COLOR_PALETTE = [
  "#e41a1c",
  "#3495e3",
  "#4dcf49",
  "#c250d3",
  "#ff7f00",
  "#ffff33",
  "#a65628",
  "#f781bf",
  "#999999",
] as const;

export const DEFAULT_TEAM_COLORS = TEAM_COLOR_PALETTE;

export function isTeamColorAllowed(color: string): boolean {
  return TEAM_COLOR_PALETTE.includes(color as (typeof TEAM_COLOR_PALETTE)[number]);
}

export type DraftDisplaySettings = {
  showRanksOnCaptainView: boolean;
  hideRanksOnCompleteTeams: boolean;
  /** When false, hide rank glyphs and show Rally Index (RAL) instead. */
  playerRanksEnabled: boolean;
  /**
   * Display-only transform for Rally Index / CALC averages, e.g. `*2` or `+1`.
   * Does not change stored scores.
   */
  rallyModifier: string;
  primarySort: PlayerSortField;
  secondarySort: PlayerSortField;
  publicBoardEnabled: boolean;
  publicShowRanks: boolean;
  publicShowSkillRatings: boolean;
  publicRosterSort: DraftRosterSortMode;
  publicRosterSortDirection: SortDirection;
  rosterAverageMetric: RosterAverageMetric;
};

const DEFAULT_DISPLAY_SETTINGS: DraftDisplaySettings = {
  showRanksOnCaptainView: true,
  hideRanksOnCompleteTeams: false,
  playerRanksEnabled: true,
  rallyModifier: "",
  publicBoardEnabled: false,
  publicShowRanks: true,
  publicShowSkillRatings: true,
  publicRosterSort: "pickOrder",
  publicRosterSortDirection: "desc",
  rosterAverageMetric: "rank",
  ...DEFAULT_SORT_SETTINGS,
};

export function parseDisplaySettings(raw: string | null | undefined): DraftDisplaySettings {
  if (!raw) {
    return { ...DEFAULT_DISPLAY_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DraftDisplaySettings>;
    return {
      showRanksOnCaptainView: parsed.showRanksOnCaptainView ?? true,
      hideRanksOnCompleteTeams: parsed.hideRanksOnCompleteTeams ?? false,
      playerRanksEnabled: parsed.playerRanksEnabled ?? true,
      rallyModifier: typeof parsed.rallyModifier === "string" ? parsed.rallyModifier.trim() : "",
      primarySort: parsed.primarySort ?? DEFAULT_SORT_SETTINGS.primarySort,
      secondarySort: parsed.secondarySort ?? DEFAULT_SORT_SETTINGS.secondarySort,
      publicBoardEnabled: parsed.publicBoardEnabled ?? false,
      publicShowRanks: parsed.publicShowRanks ?? true,
      publicShowSkillRatings: parsed.publicShowSkillRatings ?? true,
      publicRosterSort: parsePublicRosterSort(parsed),
      publicRosterSortDirection: parseSortDirection(parsed.publicRosterSortDirection),
      rosterAverageMetric: parseRosterAverageMetric(parsed.rosterAverageMetric),
    };
  } catch {
    return { ...DEFAULT_DISPLAY_SETTINGS };
  }
}

export function serializeDisplaySettings(settings: DraftDisplaySettings): string {
  return JSON.stringify(settings);
}

export function defaultTeamColor(index: number): string {
  return DEFAULT_TEAM_COLORS[index % DEFAULT_TEAM_COLORS.length];
}

export const METRIC_LABELS: Record<MetricField, string> = {
  power: "Power",
  accuracy: "Accuracy",
  intimidation: "Intimidation",
  catching: "Catching",
  evasion: "Evasion",
  nerve: "Nerve",
};

import { MetricField } from "@/lib/constants";
import {
  DEFAULT_SORT_SETTINGS,
  PlayerSortField,
} from "@/lib/draft/sort";

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
  primarySort: PlayerSortField;
  secondarySort: PlayerSortField;
};

export function parseDisplaySettings(raw: string | null | undefined): DraftDisplaySettings {
  if (!raw) {
    return {
      showRanksOnCaptainView: true,
      hideRanksOnCompleteTeams: false,
      ...DEFAULT_SORT_SETTINGS,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DraftDisplaySettings>;
    return {
      showRanksOnCaptainView: parsed.showRanksOnCaptainView ?? true,
      hideRanksOnCompleteTeams: parsed.hideRanksOnCompleteTeams ?? false,
      primarySort: parsed.primarySort ?? DEFAULT_SORT_SETTINGS.primarySort,
      secondarySort: parsed.secondarySort ?? DEFAULT_SORT_SETTINGS.secondarySort,
    };
  } catch {
    return {
      showRanksOnCaptainView: true,
      hideRanksOnCompleteTeams: false,
      ...DEFAULT_SORT_SETTINGS,
    };
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

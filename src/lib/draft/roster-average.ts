import { applyRallyModifier, type RallyModifierOp } from "@/lib/draft/rally-modifier";

export type RosterAverageMetric = "rank" | "calc";

export function parseRosterAverageMetric(
  raw: string | null | undefined,
): RosterAverageMetric {
  return raw === "calc" ? "calc" : "rank";
}

export type RosterAverageStats = {
  avgRank: number | null;
  avgOverall?: number | null;
};

export function getRosterAverageValue(
  stats: RosterAverageStats,
  metric: RosterAverageMetric,
  modifier: RallyModifierOp | null = null,
): number | null {
  if (metric === "calc") {
    const raw = stats.avgOverall ?? null;
    if (raw == null) return null;
    return applyRallyModifier(raw, modifier);
  }
  return stats.avgRank;
}

export function formatRosterAverageValue(
  stats: RosterAverageStats,
  metric: RosterAverageMetric,
  modifier: RallyModifierOp | null = null,
): string {
  const value = getRosterAverageValue(stats, metric, modifier);
  if (value == null) return "—";
  return value.toFixed(2);
}

/** Always labeled the same in the UI regardless of underlying metric. */
export function rosterAverageLabel(_metric?: RosterAverageMetric): string {
  return "Roster average";
}

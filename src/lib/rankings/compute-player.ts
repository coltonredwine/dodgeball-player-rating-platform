import { MetricField, METRIC_FIELDS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  averageMetricValues,
  buildMetricsFromAverages,
  computeScoresFromMetrics,
  PlayerMetrics,
  roundScore,
} from "@/lib/rankings/compute-metrics";
import { parseRankThresholds, RankThresholds } from "@/lib/rankings/thresholds";

export type { ComputedPlayerScores, PlayerMetrics } from "@/lib/rankings/compute-metrics";
export { DEFAULT_RANK_THRESHOLDS, parseRankThresholds } from "@/lib/rankings/thresholds";

type RatingRow = {
  raterId: string;
  power: number | null;
  accuracy: number | null;
  intimidation: number | null;
  catching: number | null;
  evasion: number | null;
  nerve: number | null;
  unknownPlayer: boolean;
};

export async function loadSeasonRatingsForPlayers(
  leagueId: string,
  seasonLabel: string,
  playerIds: string[],
): Promise<Map<string, RatingRow[]>> {
  if (playerIds.length === 0) return new Map();

  const submissions = await prisma.ratingSubmission.findMany({
    where: {
      leagueId,
      seasonLabel,
      ratings: { some: { playerId: { in: playerIds }, unknownPlayer: false } },
    },
    select: {
      raterId: true,
      ratings: {
        where: { playerId: { in: playerIds }, unknownPlayer: false },
        select: {
          playerId: true,
          power: true,
          accuracy: true,
          intimidation: true,
          catching: true,
          evasion: true,
          nerve: true,
          unknownPlayer: true,
        },
      },
    },
  });

  const byPlayer = new Map<string, RatingRow[]>();
  for (const submission of submissions) {
    for (const rating of submission.ratings) {
      const rows = byPlayer.get(rating.playerId) ?? [];
      rows.push({
        raterId: submission.raterId,
        power: rating.power,
        accuracy: rating.accuracy,
        intimidation: rating.intimidation,
        catching: rating.catching,
        evasion: rating.evasion,
        nerve: rating.nerve,
        unknownPlayer: rating.unknownPlayer,
      });
      byPlayer.set(rating.playerId, rows);
    }
  }
  return byPlayer;
}

export function computeMetricAverages(
  ratings: RatingRow[],
  excludedRaterIds: Set<string>,
): Partial<Record<MetricField, number | null>> {
  const eligible = ratings.filter((r) => !excludedRaterIds.has(r.raterId));
  const result: Partial<Record<MetricField, number | null>> = {};
  for (const field of METRIC_FIELDS) {
    const values = eligible
      .map((r) => r[field])
      .filter((v): v is number => v != null);
    result[field] = averageMetricValues(values);
  }
  return result;
}

export function applyMetricOverrides(
  averages: Partial<Record<MetricField, number | null>>,
  overrides: Partial<Record<MetricField, number>>,
): Partial<Record<MetricField, number | null>> {
  const merged = { ...averages };
  for (const [field, value] of Object.entries(overrides) as [MetricField, number][]) {
    merged[field] = roundScore(value);
  }
  return merged;
}

export const DEFAULT_MISSING_METRIC = 1;

export function fillMissingMetricAverages(
  averages: Partial<Record<MetricField, number | null>>,
): Record<MetricField, number> {
  const result = {} as Record<MetricField, number>;
  for (const field of METRIC_FIELDS) {
    const value = averages[field];
    result[field] =
      value != null && !Number.isNaN(value) ? roundScore(value) : DEFAULT_MISSING_METRIC;
  }
  return result;
}

export function resolvePlayerScores(
  ratings: RatingRow[],
  excludedRaterIds: Set<string>,
  overrides: Partial<Record<MetricField, number>>,
  thresholds?: RankThresholds,
) {
  const raterAverages = computeMetricAverages(ratings, excludedRaterIds);
  const withDefaults = fillMissingMetricAverages(raterAverages);
  const merged = applyMetricOverrides(withDefaults, overrides);
  const metrics = buildMetricsFromAverages(merged);
  if (!metrics) {
    throw new Error("Expected merged metrics after filling defaults");
  }
  return {
    averages: withDefaults,
    scores: computeScoresFromMetrics(metrics, thresholds),
  };
}

export function computePlayerScores(
  averages: Partial<Record<MetricField, number | null>>,
  thresholds?: RankThresholds,
) {
  const withDefaults = fillMissingMetricAverages(averages);
  const metrics = buildMetricsFromAverages(withDefaults);
  if (!metrics) return null;
  return computeScoresFromMetrics(metrics, thresholds);
}

export function parseDraftRankThresholds(json: string | null | undefined): RankThresholds {
  if (!json) return parseRankThresholds(null);
  try {
    return parseRankThresholds(JSON.parse(json));
  } catch {
    return parseRankThresholds(null);
  }
}

export function computeTeamStats(
  rosters: Array<{ rank: number; displayOffensive: number; displayDefensive: number }>,
) {
  if (rosters.length === 0) {
    return { avgRank: null, avgOffensive: null, avgDefensive: null, offensiveCount: 0, defensiveCount: 0 };
  }
  const avgRank = roundScore(rosters.reduce((s, p) => s + p.rank, 0) / rosters.length);
  const avgOffensive = roundScore(rosters.reduce((s, p) => s + p.displayOffensive, 0) / rosters.length);
  const avgDefensive = roundScore(rosters.reduce((s, p) => s + p.displayDefensive, 0) / rosters.length);
  const offensiveCount = rosters.filter((p) => p.displayOffensive >= p.displayDefensive).length;
  const defensiveCount = rosters.length - offensiveCount;
  return { avgRank, avgOffensive, avgDefensive, offensiveCount, defensiveCount };
}

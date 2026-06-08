import { MetricField, METRIC_FIELDS } from "@/lib/constants";
import { assignRank, RankThresholds } from "@/lib/rankings/thresholds";

export type PlayerMetrics = {
  power: number;
  accuracy: number;
  intimidation: number;
  catching: number;
  evasion: number;
  nerve: number;
};

export type ComputedPlayerScores = {
  metrics: PlayerMetrics;
  offensive: number;
  defensive: number;
  balanced: number;
  psych: number;
  psychFactor: number;
  overall: number;
  rank: number;
  leaning: "offensive" | "defensive";
  displayOffensive: number;
  displayDefensive: number;
  displayPsych: number;
};

/** Round to N decimal places (default 2) for displayed / stored scores. */
export function roundScore(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/** Excel AVERAGE of two weighted values: (a*w1 + b*w2) / 2 */
function weightedAverage(a: number, aWeight: number, b: number, bWeight: number): number {
  return (a * aWeight + b * bWeight) / 2;
}

function computePsychFactor(psych: number): number {
  const maxPsych = 1.2;
  const base = 0.95;
  const exponent = 1.5;
  const normalized = Math.pow((psych * 6 - 1) / 6, exponent);
  return 0.95 * Math.pow(maxPsych / base, normalized);
}

export function computeScoresFromMetrics(
  metrics: PlayerMetrics,
  thresholds?: RankThresholds,
): ComputedPlayerScores {
  const { power, accuracy, catching, evasion, intimidation, nerve } = metrics;

  const offensive = (weightedAverage(power, 0.35, accuracy, 0.65) * 2) / 6;
  const defensive = (weightedAverage(catching, 0.65, evasion, 0.35) * 2) / 6;
  const balanced = weightedAverage(offensive, 0.58, defensive, 0.42) * 2;
  const psych = (weightedAverage(intimidation, 0.35, nerve, 0.65) * 2) / 6;
  const psychFactor = computePsychFactor(psych);
  const overall = roundScore(balanced * psychFactor);
  const rank = assignRank(overall, thresholds);
  const leaning: "offensive" | "defensive" =
    offensive >= defensive ? "offensive" : "defensive";

  return {
    metrics,
    offensive,
    defensive,
    balanced,
    psych,
    psychFactor,
    overall,
    rank,
    leaning,
    displayOffensive: roundScore(offensive * 6),
    displayDefensive: roundScore(defensive * 6),
    displayPsych: roundScore(psych * 6),
  };
}

export function averageMetricValues(values: number[]): number | null {
  if (values.length === 0) return null;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return roundScore(avg);
}

export function buildMetricsFromAverages(
  averages: Partial<Record<MetricField, number | null>>,
): PlayerMetrics | null {
  const metrics = {} as PlayerMetrics;
  for (const field of METRIC_FIELDS) {
    const value = averages[field];
    if (value == null || Number.isNaN(value)) return null;
    metrics[field] = value;
  }
  return metrics;
}

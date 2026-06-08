/** Ranks 1 (lowest) through 5 (highest). */
export const RANKS_DESC = [5, 4, 3, 2, 1] as const;

export function formatRank(rank: number): string {
  return String(rank);
}

export function formatRankLabel(rank: number): string {
  return `Rank ${formatRank(rank)}`;
}

/** Round numeric roster average to nearest rank. */
export function formatRankAverage(avg: number): string {
  return formatRank(Math.round(avg));
}

export type RankThresholds = {
  "2": number;
  "3": number;
  "4": number;
  "5": number;
};

export const DEFAULT_RANK_THRESHOLDS: RankThresholds = {
  "2": 0.605,
  "3": 0.69,
  "4": 0.805,
  "5": 1.0,
};

export const RANK_MIN = 1;
export const RANK_MAX = 5;

export function parseRankThresholds(raw: unknown): RankThresholds {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_RANK_THRESHOLDS };
  const obj = raw as Record<string, unknown>;
  return {
    "2": typeof obj["2"] === "number" ? obj["2"] : DEFAULT_RANK_THRESHOLDS["2"],
    "3": typeof obj["3"] === "number" ? obj["3"] : DEFAULT_RANK_THRESHOLDS["3"],
    "4": typeof obj["4"] === "number" ? obj["4"] : DEFAULT_RANK_THRESHOLDS["4"],
    "5": typeof obj["5"] === "number" ? obj["5"] : DEFAULT_RANK_THRESHOLDS["5"],
  };
}

export function serializeRankThresholds(thresholds: RankThresholds): string {
  return JSON.stringify(thresholds);
}

/** Highest rank (5) whose minimum CALC threshold the player meets. Returns 1–5. */
export function assignRank(overall: number, thresholds: RankThresholds = DEFAULT_RANK_THRESHOLDS): number {
  let rank = RANK_MIN;
  if (overall >= thresholds["2"]) rank = 2;
  if (overall >= thresholds["3"]) rank = 3;
  if (overall >= thresholds["4"]) rank = 4;
  if (overall >= thresholds["5"]) rank = 5;
  return rank;
}

/**
 * Draft-room CALC display: rank plus progress toward the next rank threshold.
 * Example: rank 3 with score halfway between rank 3 and 4 thresholds → "3.50".
 */
export function formatCalcRankDisplay(
  overall: number,
  rank: number,
  thresholds: RankThresholds = DEFAULT_RANK_THRESHOLDS,
): string {
  let lower: number;
  let upper: number;

  if (rank <= 1) {
    lower = 0;
    upper = thresholds["2"];
  } else if (rank >= RANK_MAX) {
    lower = thresholds["5"];
    upper = Math.max(thresholds["5"] + 0.001, 1);
  } else {
    const key = String(rank) as "2" | "3" | "4";
    const nextKey = String(rank + 1) as "3" | "4" | "5";
    lower = thresholds[key];
    upper = thresholds[nextKey];
  }

  const span = upper - lower;
  const progress = span <= 0 ? 0 : Math.min(1, Math.max(0, (overall - lower) / span));
  return `${rank}.${Math.round(progress * 100)
    .toString()
    .padStart(2, "0")}`;
}

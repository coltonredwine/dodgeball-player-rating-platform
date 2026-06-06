import { METRIC_FIELDS } from "@/lib/constants";

export type SavedRating = {
  playerId?: string;
  unknownPlayer: boolean;
  power: number | null;
  accuracy: number | null;
  intimidation: number | null;
  catching: number | null;
  evasion: number | null;
  nerve: number | null;
};

export function isCompleteSavedRow(rating: SavedRating) {
  if (rating.unknownPlayer) return true;
  return METRIC_FIELDS.every(
    (field) => typeof rating[field] === "number" && rating[field]! >= 1 && rating[field]! <= 7,
  );
}

export function hasAnyRatingData(rating: SavedRating) {
  if (rating.unknownPlayer) return true;
  return METRIC_FIELDS.some((field) => rating[field] !== null);
}

export function getRaterProgress(
  ratings: SavedRating[],
  activePlayersCount: number,
  activePlayerIds?: string[],
) {
  const ratingByPlayerId = new Map(
    ratings.filter((rating) => rating.playerId).map((rating) => [rating.playerId!, rating]),
  );

  let completeCount = 0;
  let enteredCount = 0;

  if (activePlayerIds && activePlayerIds.length > 0) {
    for (const playerId of activePlayerIds) {
      const rating = ratingByPlayerId.get(playerId);
      if (!rating) continue;
      if (hasAnyRatingData(rating)) enteredCount += 1;
      if (isCompleteSavedRow(rating)) completeCount += 1;
    }
  } else {
    completeCount = ratings.filter(isCompleteSavedRow).length;
    enteredCount = ratings.filter(hasAnyRatingData).length;
  }

  const playerTotal = activePlayerIds?.length ?? activePlayersCount;
  const incompleteCount = Math.max(playerTotal - completeCount, 0);
  const isFullyComplete = playerTotal > 0 && completeCount === playerTotal;

  return {
    completeCount,
    enteredCount,
    incompleteCount,
    isFullyComplete,
    hasAnySavedRows: enteredCount > 0,
  };
}

export type CompletionCategory = "complete" | "incomplete" | "not_started";

export function getCompletionCategory(
  progress: ReturnType<typeof getRaterProgress>,
): CompletionCategory {
  if (progress.isFullyComplete) return "complete";
  if (progress.enteredCount === 0) return "not_started";
  return "incomplete";
}

export function tallyCompletionCategories(categories: CompletionCategory[]) {
  return categories.reduce(
    (counts, category) => {
      counts[category] += 1;
      return counts;
    },
    { complete: 0, incomplete: 0, not_started: 0 },
  );
}

export function formatProgressLabel(
  progress: ReturnType<typeof getRaterProgress>,
  activePlayersCount: number,
) {
  if (progress.isFullyComplete) {
    return "complete";
  }
  if (progress.enteredCount === 0) {
    return "not started";
  }
  return `${progress.enteredCount}/${activePlayersCount} entered · ${progress.incompleteCount} incomplete`;
}

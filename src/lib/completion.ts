import { METRIC_FIELDS } from "@/lib/constants";

export type SavedRating = {
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
  submittedAt: Date | null | undefined,
  status?: "in_progress" | "submitted",
) {
  const completeCount = ratings.filter(isCompleteSavedRow).length;
  const enteredCount = ratings.filter(hasAnyRatingData).length;
  const incompleteCount = Math.max(activePlayersCount - completeCount, 0);
  const isFullyComplete = activePlayersCount > 0 && completeCount === activePlayersCount;
  const isSubmittedComplete =
    isFullyComplete && (Boolean(submittedAt) || status === "submitted");

  return {
    completeCount,
    enteredCount,
    incompleteCount,
    isFullyComplete,
    isSubmittedComplete,
    hasAnySavedRows: enteredCount > 0,
  };
}

export function formatProgressLabel(
  progress: ReturnType<typeof getRaterProgress>,
  activePlayersCount: number,
) {
  if (progress.isSubmittedComplete) {
    return "complete";
  }
  if (progress.enteredCount === 0) {
    return "not started";
  }
  return `${progress.enteredCount}/${activePlayersCount} entered · ${progress.incompleteCount} incomplete`;
}

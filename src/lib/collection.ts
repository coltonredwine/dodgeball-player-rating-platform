import { CollectionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getOrCreateSubmission } from "@/lib/rating";

export const COLLECTION_STATUS_OPTIONS: { value: CollectionStatus; label: string }[] = [
  { value: "not_collected", label: "Not collected" },
  { value: "collected", label: "Collected" },
  { value: "partially_collected", label: "Partially collected" },
];

export async function getActivePlayerCount() {
  return prisma.player.count({ where: { active: true } });
}

/** Downgrade collected submissions when new active players were added. */
export async function syncCollectedSubmissionsForNewPlayers(activePlayerCount?: number) {
  const count = activePlayerCount ?? (await getActivePlayerCount());
  const now = new Date();

  await prisma.ratingSubmission.updateMany({
    where: {
      collectionStatus: CollectionStatus.collected,
      collectedActivePlayerCount: { lt: count },
    },
    data: {
      collectionStatus: CollectionStatus.partially_collected,
      collectionStatusAt: now,
    },
  });
}

export function isRaterScoringLocked(
  submission: { collectionStatus: CollectionStatus; adminLocked: boolean },
  scoringOpen: boolean,
): boolean {
  if (!scoringOpen) return true;
  if (submission.adminLocked) return true;
  return submission.collectionStatus === CollectionStatus.collected;
}

export function getLastActivityAt(submission: {
  lastAutosavedAt: Date | null;
  submittedAt: Date | null;
} | null): Date | null {
  if (!submission) return null;
  const candidates = [submission.lastAutosavedAt, submission.submittedAt].filter(
    (value): value is Date => value != null,
  );
  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates.map((value) => value.getTime())));
}

export function formatTimestamp(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export async function updateRaterCollectionStatus(
  raterId: string,
  status: CollectionStatus,
  activePlayerCount: number,
) {
  const submission = await getOrCreateSubmission(raterId);
  const now = new Date();

  if (status === CollectionStatus.not_collected) {
    return prisma.ratingSubmission.update({
      where: { id: submission.id },
      data: {
        collectionStatus: CollectionStatus.not_collected,
        collectionStatusAt: null,
        collectedActivePlayerCount: null,
      },
    });
  }

  if (status === CollectionStatus.collected) {
    return prisma.ratingSubmission.update({
      where: { id: submission.id },
      data: {
        collectionStatus: CollectionStatus.collected,
        collectionStatusAt: now,
        collectedActivePlayerCount: activePlayerCount,
      },
    });
  }

  return prisma.ratingSubmission.update({
    where: { id: submission.id },
    data: {
      collectionStatus: CollectionStatus.partially_collected,
      collectionStatusAt: now,
      collectedActivePlayerCount: null,
    },
  });
}

export async function isSubmissionScoringLocked(submissionId: string, scoringOpen: boolean) {
  const submission = await prisma.ratingSubmission.findUnique({
    where: { id: submissionId },
    select: { collectionStatus: true, adminLocked: true },
  });
  if (!submission) return !scoringOpen;
  return isRaterScoringLocked(submission, scoringOpen);
}

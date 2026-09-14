import { prisma } from "@/lib/db";
import { isCompleteSavedRow } from "@/lib/completion";
import { getSeasonLabel } from "@/lib/settings";

/** Mark every completed player rating in the league's current season as needing review. */
export async function markAllCompletedRatingsForReview(leagueId: string) {
  const seasonLabel = await getSeasonLabel(leagueId);
  const submissions = await prisma.ratingSubmission.findMany({
    where: { leagueId, seasonLabel },
    select: {
      id: true,
      ratings: {
        select: {
          id: true,
          unknownPlayer: true,
          power: true,
          accuracy: true,
          intimidation: true,
          catching: true,
          evasion: true,
          nerve: true,
        },
      },
    },
  });

  const ids = submissions.flatMap((submission) =>
    submission.ratings.filter(isCompleteSavedRow).map((rating) => rating.id),
  );

  if (ids.length === 0) {
    return { updatedCount: 0, seasonLabel };
  }

  const result = await prisma.playerRating.updateMany({
    where: { id: { in: ids } },
    data: { needsReview: true },
  });

  return { updatedCount: result.count, seasonLabel };
}

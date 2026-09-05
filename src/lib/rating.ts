import { prisma } from "@/lib/db";
import { getSeasonLabel } from "@/lib/settings";

export async function getOrCreateSubmission(raterId: string, leagueId: string) {
  const seasonLabel = await getSeasonLabel(leagueId);
  return prisma.ratingSubmission.upsert({
    where: { raterId_seasonLabel: { raterId, seasonLabel } },
    create: { raterId, leagueId, seasonLabel },
    update: {},
  });
}

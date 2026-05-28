import { prisma } from "@/lib/db";
import { getSeasonLabel } from "@/lib/settings";

export async function getOrCreateSubmission(raterId: string) {
  const seasonLabel = await getSeasonLabel();
  return prisma.ratingSubmission.upsert({
    where: { raterId_seasonLabel: { raterId, seasonLabel } },
    create: { raterId, seasonLabel },
    update: {},
  });
}

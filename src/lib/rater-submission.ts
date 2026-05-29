import { prisma } from "@/lib/db";

export async function getLatestRaterSubmission(raterId: string) {
  return prisma.ratingSubmission.findFirst({
    where: { raterId },
    orderBy: { updatedAt: "desc" },
    include: {
      rater: true,
      ratings: {
        include: { player: true },
        orderBy: [{ player: { lastName: "asc" } }, { player: { firstName: "asc" } }],
      },
    },
  });
}

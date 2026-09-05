import { prisma } from "@/lib/db";

export function normalizePlayerName(value: string) {
  return value.trim();
}

/** Legacy helper kept for CSV name matching keys (not used as DB ids for new players). */
export function playerIdFromNames(firstName: string, lastName: string) {
  return `${firstName.trim().toLowerCase()}-${lastName.trim().toLowerCase()}`;
}

export async function findPlayerByNamesInLeague(
  leagueId: string,
  firstName: string,
  lastName: string,
) {
  const first = normalizePlayerName(firstName);
  const last = normalizePlayerName(lastName);
  return prisma.player.findFirst({
    where: {
      leagueId,
      firstName: { equals: first, mode: "insensitive" },
      lastName: { equals: last, mode: "insensitive" },
    },
  });
}

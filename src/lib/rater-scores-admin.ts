import { prisma } from "@/lib/db";
import { getOrCreateSubmission } from "@/lib/rating";
import { mergeCsvIntoRatingRows, type ImportableRatingRow } from "@/lib/rating-csv-import";
import { normalizeRatingRow } from "@/lib/validation";

export async function buildActivePlayerRatingRows(raterId: string, leagueId: string) {
  const submission = await getOrCreateSubmission(raterId, leagueId);
  const [players, existing] = await Promise.all([
    prisma.player.findMany({
      where: { leagueId, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.playerRating.findMany({ where: { submissionId: submission.id } }),
  ]);

  const existingMap = new Map(existing.map((entry) => [entry.playerId, entry]));
  const rows: ImportableRatingRow[] = players.map((player) => {
    const row = existingMap.get(player.id);
    return {
      playerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      link: player.link,
      power: row?.power ?? null,
      accuracy: row?.accuracy ?? null,
      intimidation: row?.intimidation ?? null,
      catching: row?.catching ?? null,
      evasion: row?.evasion ?? null,
      nerve: row?.nerve ?? null,
      unknownPlayer: row?.unknownPlayer ?? false,
    };
  });

  return { submission, rows };
}

export async function saveRatingRowsForSubmission(
  submissionId: string,
  rows: ImportableRatingRow[],
) {
  const now = new Date();
  const existing = await prisma.ratingSubmission.findUnique({
    where: { id: submissionId },
    select: { status: true, submittedAt: true },
  });

  const normalized = rows.map((row) =>
    normalizeRatingRow({
      playerId: row.playerId,
      unknownPlayer: row.unknownPlayer,
      power: row.power,
      accuracy: row.accuracy,
      intimidation: row.intimidation,
      catching: row.catching,
      evasion: row.evasion,
      nerve: row.nerve,
    }),
  );

  await prisma.$transaction(async (tx) => {
    for (const row of normalized) {
      await tx.playerRating.upsert({
        where: {
          submissionId_playerId: { submissionId, playerId: row.playerId },
        },
        update: {
          unknownPlayer: row.unknownPlayer,
          power: row.power,
          accuracy: row.accuracy,
          intimidation: row.intimidation,
          catching: row.catching,
          evasion: row.evasion,
          nerve: row.nerve,
        },
        create: {
          submissionId,
          playerId: row.playerId,
          unknownPlayer: row.unknownPlayer,
          power: row.power,
          accuracy: row.accuracy,
          intimidation: row.intimidation,
          catching: row.catching,
          evasion: row.evasion,
          nerve: row.nerve,
        },
      });
    }

    await tx.ratingSubmission.update({
      where: { id: submissionId },
      data: {
        status: existing?.status ?? "in_progress",
        submittedAt: existing?.submittedAt,
        lastAutosavedAt: now,
        lastSyncedAt: now,
      },
    });
  });
}

export async function importRaterScoresFromCsv(
  raterId: string,
  leagueId: string,
  csvText: string,
) {
  const { submission, rows } = await buildActivePlayerRatingRows(raterId, leagueId);
  const result = mergeCsvIntoRatingRows(csvText, rows);

  if (result.formatError) {
    return { ok: false as const, error: result.formatError };
  }

  await saveRatingRowsForSubmission(submission.id, result.rows);
  return { ok: true as const, updatedCount: result.updatedCount };
}

export async function resetRaterScores(raterId: string, leagueId: string) {
  const submission = await getOrCreateSubmission(raterId, leagueId);

  await prisma.$transaction([
    prisma.playerRating.deleteMany({ where: { submissionId: submission.id } }),
    prisma.ratingSubmission.update({
      where: { id: submission.id },
      data: {
        status: "in_progress",
        submittedAt: null,
        lastAutosavedAt: null,
        lastSyncedAt: null,
      },
    }),
  ]);
}

export async function setRaterAdminLocked(raterId: string, leagueId: string, locked: boolean) {
  const submission = await getOrCreateSubmission(raterId, leagueId);
  return prisma.ratingSubmission.update({
    where: { id: submission.id },
    data: { adminLocked: locked },
  });
}

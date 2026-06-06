import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isSubmissionScoringLocked } from "@/lib/collection";
import { isScoringOpen } from "@/lib/scoring-window";
import {
  autosaveSchema,
  isCompleteRatingRow,
  normalizeRatingRow,
} from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = autosaveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { submissionId, rows } = parsed.data;
  const submission = await prisma.ratingSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (session.role !== "superadmin" && submission.raterId !== session.raterId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (await isSubmissionScoringLocked(submissionId, await isScoringOpen())) {
    return NextResponse.json({ error: "Scoring is closed" }, { status: 403 });
  }

  const activePlayers = await prisma.player.findMany({
    where: { active: true },
    select: { id: true },
  });
  const activePlayerIds = new Set(activePlayers.map((player) => player.id));
  const normalizedRows = rows
    .filter((row) => activePlayerIds.has(row.playerId))
    .map((row) => normalizeRatingRow(row));

  const completeRows = normalizedRows.filter((row) => isCompleteRatingRow(row));
  if (
    normalizedRows.length !== activePlayerIds.size ||
    completeRows.length !== activePlayerIds.size
  ) {
    return NextResponse.json(
      {
        error:
          "Cannot submit until all active players are complete (all six scores or I don't know).",
      },
      { status: 400 },
    );
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const row of normalizedRows) {
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
        status: "submitted",
        submittedAt: now,
        lastAutosavedAt: now,
        lastSyncedAt: now,
      },
    });
  });

  return NextResponse.json({ ok: true });
}

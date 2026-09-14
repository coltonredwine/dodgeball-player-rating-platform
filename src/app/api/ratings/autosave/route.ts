import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isSubmissionScoringLocked } from "@/lib/collection";
import { isScoringOpen } from "@/lib/scoring-window";
import { autosaveSchema, normalizeRatingRow } from "@/lib/validation";

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

  if (submission.leagueId !== session.leagueId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (await isSubmissionScoringLocked(submissionId, await isScoringOpen(submission.leagueId))) {
    return NextResponse.json({ error: "Scoring is closed" }, { status: 403 });
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const rowRaw of rows) {
      const row = normalizeRatingRow(rowRaw);
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
          ...(typeof row.needsReview === "boolean" ? { needsReview: row.needsReview } : {}),
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
          needsReview: row.needsReview ?? false,
        },
      });
    }

    await tx.ratingSubmission.update({
      where: { id: submissionId },
      data: {
        ...(submission.status === "submitted" ? {} : { status: "in_progress" }),
        lastAutosavedAt: now,
        lastSyncedAt: now,
      },
    });
  });

  return NextResponse.json({ ok: true });
}

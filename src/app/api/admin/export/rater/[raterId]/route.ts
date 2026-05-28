import { NextResponse } from "next/server";
import { requireAdminLike } from "@/lib/api-auth";
import { rowsToCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ raterId: string }> },
) {
  const auth = await requireAdminLike();
  if (auth.error) return auth.error;
  const { raterId } = await params;

  const submission = await prisma.ratingSubmission.findFirst({
    where: { raterId },
    orderBy: { updatedAt: "desc" },
  });
  if (!submission) {
    return NextResponse.json({ error: "No submission found" }, { status: 404 });
  }

  const ratings = await prisma.playerRating.findMany({
    where: { submissionId: submission.id },
    include: { player: true },
    orderBy: [{ player: { lastName: "asc" } }, { player: { firstName: "asc" } }],
  });

  const rows = ratings.map((row) => [
    row.player.firstName,
    row.player.lastName,
    row.power,
    row.accuracy,
    row.intimidation,
    row.catching,
    row.evasion,
    row.nerve,
    row.unknownPlayer ? "true" : "false",
  ]);
  const csv = rowsToCsv(
    [
      "First Name",
      "Last Name",
      "Power",
      "Accuracy",
      "Intimidation",
      "Catching",
      "Evasion",
      "Nerve",
      "I don't know this player",
    ],
    rows,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="rater-${raterId}.csv"`,
    },
  });
}

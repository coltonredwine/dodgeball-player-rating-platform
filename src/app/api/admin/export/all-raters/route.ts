import { NextResponse } from "next/server";
import { requireAdminLike } from "@/lib/api-auth";
import { rowsToCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireAdminLike();
  if (auth.error) return auth.error;

  const ratings = await prisma.playerRating.findMany({
    include: {
      player: true,
      submission: { include: { rater: true } },
    },
    orderBy: [{ submission: { rater: { name: "asc" } } }, { player: { lastName: "asc" } }],
  });

  const rows = ratings.map((row) => [
    row.submission.rater.name,
    row.submission.rater.email,
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
      "Rater Name",
      "Rater Email",
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
      "Content-Disposition": 'attachment; filename="all-raters.csv"',
    },
  });
}

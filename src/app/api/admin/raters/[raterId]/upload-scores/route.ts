import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { assertRaterInLeague } from "@/lib/league";
import { importRaterScoresFromCsv } from "@/lib/rater-scores-admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ raterId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const leagueId = auth.session.leagueId;
  const { raterId } = await params;

  try {
    await assertRaterInLeague(raterId, leagueId);
  } catch {
    return NextResponse.json({ error: "Rater not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const text = await file.text();
  const result = await importRaterScoresFromCsv(raterId, leagueId, text);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, updatedCount: result.updatedCount });
}

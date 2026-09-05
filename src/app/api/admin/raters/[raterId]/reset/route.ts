import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { assertRaterInLeague } from "@/lib/league";
import { resetRaterScores } from "@/lib/rater-scores-admin";

export async function POST(
  _request: Request,
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

  await resetRaterScores(raterId, leagueId);

  return NextResponse.json({ ok: true });
}

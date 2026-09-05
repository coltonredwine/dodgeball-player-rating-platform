import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { assertRaterInLeague } from "@/lib/league";
import { setRaterAdminLocked } from "@/lib/rater-scores-admin";

export async function PATCH(
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

  const body = (await request.json()) as { locked?: boolean };

  if (typeof body.locked !== "boolean") {
    return NextResponse.json({ error: "locked must be a boolean" }, { status: 400 });
  }

  const submission = await setRaterAdminLocked(raterId, leagueId, body.locked);

  return NextResponse.json({
    submission: {
      id: submission.id,
      adminLocked: submission.adminLocked,
    },
  });
}

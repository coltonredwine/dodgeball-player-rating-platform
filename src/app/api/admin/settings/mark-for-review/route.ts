import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/api-auth";
import { markAllCompletedRatingsForReview } from "@/lib/rating-review";

export async function POST() {
  const auth = await requireSuperadmin();
  if ("error" in auth) return auth.error;

  try {
    const result = await markAllCompletedRatingsForReview(auth.session.leagueId);
    return NextResponse.json({
      ok: true,
      updatedCount: result.updatedCount,
      seasonLabel: result.seasonLabel,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not mark players for review" },
      { status: 400 },
    );
  }
}

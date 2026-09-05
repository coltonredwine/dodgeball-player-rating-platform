import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/api-auth";
import { backendRedirectForLeague } from "@/lib/request-url";
import { saveScoringWindowSettings } from "@/lib/scoring-window";

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const leagueId = auth.session.leagueId;
  const formData = await request.formData();
  const scoringOpen = formData.get("scoringOpen") === "true";
  const closeAtRaw = String(formData.get("scoringCloseAt") ?? "").trim();

  if (closeAtRaw) {
    const closeAt = new Date(closeAtRaw);
    if (Number.isNaN(closeAt.getTime())) {
      return NextResponse.json({ error: "Invalid close date/time" }, { status: 400 });
    }
    await saveScoringWindowSettings(leagueId, scoringOpen, closeAt.toISOString());
  } else {
    await saveScoringWindowSettings(leagueId, scoringOpen, null);
  }

  return backendRedirectForLeague(request, auth.session.leagueId, undefined, "/backend/settings");
}

import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/api-auth";
import { backendRedirect } from "@/lib/request-url";
import { saveScoringWindowSettings } from "@/lib/scoring-window";

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const formData = await request.formData();
  const scoringOpen = formData.get("scoringOpen") === "true";
  const closeAtRaw = String(formData.get("scoringCloseAt") ?? "").trim();

  if (closeAtRaw) {
    const closeAt = new Date(closeAtRaw);
    if (Number.isNaN(closeAt.getTime())) {
      return NextResponse.json({ error: "Invalid close date/time" }, { status: 400 });
    }
    await saveScoringWindowSettings(scoringOpen, closeAt.toISOString());
  } else {
    await saveScoringWindowSettings(scoringOpen, null);
  }

  return backendRedirect(request, undefined, "/backend/settings");
}

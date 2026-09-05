import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { getCaptainAssignmentsForRater } from "@/lib/draft/service";
import { getLeagueById } from "@/lib/league";
import { leaguePath } from "@/lib/league-path";

export async function GET() {
  const session = await resolveSession();
  if (!session?.raterId) {
    return NextResponse.json({ assignments: [] });
  }

  const league = await getLeagueById(session.leagueId);
  const slug = league?.slug;

  const assignments = await getCaptainAssignmentsForRater(session.raterId);
  return NextResponse.json({
    assignments: assignments.map((a) => ({
      draftId: a.draftId,
      draftName: a.draft.name,
      isLive: a.draft.isLive,
      teamColor: a.color,
      pickUrl: leaguePath(slug ?? "league", `/draft/${a.draftId}/pick`),
    })),
  });
}

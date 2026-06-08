import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { getCaptainAssignmentsForRater } from "@/lib/draft/service";

export async function GET() {
  const session = await resolveSession();
  if (!session?.raterId) {
    return NextResponse.json({ assignments: [] });
  }

  const assignments = await getCaptainAssignmentsForRater(session.raterId);
  return NextResponse.json({
    assignments: assignments.map((a) => ({
      draftId: a.draftId,
      draftName: a.draft.name,
      isLive: a.draft.isLive,
      teamColor: a.color,
      pickUrl: `/draft/${a.draftId}/pick`,
    })),
  });
}

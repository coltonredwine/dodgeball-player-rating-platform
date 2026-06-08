import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { buildDraftState, canTeamPickPlayer } from "@/lib/draft/service";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ draftId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { draftId } = await params;
  const state = await buildDraftState(draftId);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let captainTeamId: string | null = null;
  if (session.raterId) {
    const team = await prisma.draftTeam.findFirst({
      where: { draftId, raterId: session.raterId },
    });
    captainTeamId = team?.id ?? null;
  }

  const flagged =
    captainTeamId != null
      ? await prisma.captainPlayerFlag.findMany({
          where: { draftId, teamId: captainTeamId },
          select: { playerId: true },
        })
      : [];

  const eligibility: Record<string, boolean> = {};
  if (captainTeamId) {
    for (const player of state.undrafted) {
      eligibility[player.playerId] = canTeamPickPlayer(state, captainTeamId, player.playerId);
    }
  }

  const adminPickEligibility: Record<string, boolean> = {};
  if (state.onClockTeamId) {
    for (const player of state.undrafted) {
      adminPickEligibility[player.playerId] = canTeamPickPlayer(
        state,
        state.onClockTeamId,
        player.playerId,
      );
    }
  }

  return NextResponse.json({
    ...state,
    captainTeamId,
    flaggedPlayerIds: flagged.map((f) => f.playerId),
    eligibility,
    adminPickEligibility,
    isCaptainTurn:
      captainTeamId != null &&
      state.draft.isLive &&
      state.onClockTeamId === captainTeamId,
  });
}

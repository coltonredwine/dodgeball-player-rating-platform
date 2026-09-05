import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { addPlayerToDraft, getDraftRecord, removePlayerFromDraft } from "@/lib/draft/service";

type Params = { params: Promise<{ draftId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const draft = await getDraftRecord(draftId);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (draft.leagueId !== auth.session.leagueId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const poolIds = new Set(draft.players.map((entry) => entry.playerId));
  const draftedIds = new Set(draft.picks.map((pick) => pick.playerId));
  const starterIds = new Set(draft.startingPlayers.map((entry) => entry.playerId));
  const poolLocked = draft.status === "complete";

  const players = await prisma.player.findMany({
    where: { leagueId: auth.session.leagueId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({
    draftStatus: draft.status,
    isLive: draft.isLive,
    poolCount: draft.players.length,
    players: players.map((player) => {
      const inPool = poolIds.has(player.id);
      const drafted = draftedIds.has(player.id);
      const isStarter = starterIds.has(player.id);
      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        active: player.active,
        inPool,
        drafted,
        isStarter,
        canAdd: !poolLocked && !inPool,
        canRemove: !poolLocked && inPool && !drafted && draft.players.length > 1,
      };
    }),
  });
}

const addPlayerSchema = z.object({
  playerId: z.string().min(1),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const parsed = addPlayerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await addPlayerToDraft(draftId, parsed.data.playerId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add player";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const playerId = new URL(request.url).searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  try {
    await removePlayerFromDraft(draftId, playerId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove player";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

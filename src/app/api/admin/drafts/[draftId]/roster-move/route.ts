import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { buildDraftState } from "@/lib/draft/service";
import { movePlayerToTeam } from "@/lib/draft/trades";
import { validateRosterMove } from "@/lib/draft/trade-validation";

type Params = { params: Promise<{ draftId: string }> };

const moveSchema = z.object({
  playerId: z.string(),
  toTeamId: z.string(),
  force: z.boolean().optional(),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const parsed = moveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const state = await buildDraftState(draftId);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const validation = validateRosterMove(state, parsed.data.playerId, parsed.data.toTeamId);
  if (!validation.allowed && !parsed.data.force) {
    return NextResponse.json(
      { error: validation.violations[0] ?? "Move not allowed", violations: validation.violations },
      { status: 400 },
    );
  }

  try {
    await movePlayerToTeam(draftId, parsed.data.playerId, parsed.data.toTeamId, {
      force: parsed.data.force,
    });
    return NextResponse.json({ ok: true, forced: !validation.allowed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not move player" },
      { status: 400 },
    );
  }
}

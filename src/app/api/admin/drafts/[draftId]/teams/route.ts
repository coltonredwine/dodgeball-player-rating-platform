import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { isTeamColorAllowed, TEAM_COLOR_PALETTE } from "@/lib/draft/constants";
import { getDraftRecord, updateDraftTeamCaptains } from "@/lib/draft/service";

type Params = { params: Promise<{ draftId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const draft = await getDraftRecord(draftId);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raters = await prisma.rater.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, active: true },
  });

  return NextResponse.json({
    draftStatus: draft.status,
    teams: draft.teams
      .slice()
      .sort((a, b) => a.pickOrder - b.pickOrder)
      .map((team) => ({
        id: team.id,
        pickOrder: team.pickOrder,
        color: team.color,
        raterId: team.raterId,
        captainName: team.rater.name,
      })),
    raters,
  });
}

const updateTeamsSchema = z.object({
  teams: z.array(
    z.object({
      id: z.string().min(1),
      raterId: z.string().min(1),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
    }),
  ),
});

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const parsed = updateTeamsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    for (const team of parsed.data.teams) {
      if (team.color && !isTeamColorAllowed(team.color)) {
        return NextResponse.json({ error: "Invalid team color" }, { status: 400 });
      }
    }
    await updateDraftTeamCaptains(draftId, parsed.data.teams);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update captains";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { createDraft } from "@/lib/draft/service";
import { prisma } from "@/lib/db";
import { getSeasonLabel } from "@/lib/settings";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  teamCount: z.number().int().min(2).max(12),
  playerIds: z.array(z.string()).min(1),
  captains: z
    .array(
      z.object({
        raterId: z.string(),
        pickOrder: z.number().int().min(1),
      }),
    )
    .min(2),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const leagueId = auth.session.leagueId;
  const drafts = await prisma.draft.findMany({
    where: { leagueId },
    orderBy: { createdAt: "desc" },
    include: {
      teams: { include: { rater: true } },
      _count: { select: { players: true, picks: true } },
    },
  });

  return NextResponse.json({ drafts });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const leagueId = auth.session.leagueId;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, teamCount, playerIds, captains } = parsed.data;
  if (captains.length !== teamCount) {
    return NextResponse.json({ error: "Captain count must match team count" }, { status: 400 });
  }

  const seasonLabel = await getSeasonLabel(leagueId);
  const draft = await createDraft({
    leagueId,
    name,
    seasonLabel,
    teamCount,
    playerIds,
    captains,
  });
  return NextResponse.json({ draft }, { status: 201 });
}

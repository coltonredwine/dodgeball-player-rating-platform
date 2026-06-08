import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ draftId: string }> };

const flagSchema = z.object({
  playerId: z.string(),
  flagged: z.boolean(),
});

export async function POST(request: Request, { params }: Params) {
  const session = await resolveSession();
  if (!session?.raterId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId } = await params;
  const parsed = flagSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const team = await prisma.draftTeam.findFirst({
    where: { draftId, raterId: session.raterId },
  });
  if (!team) {
    return NextResponse.json({ error: "Not a captain" }, { status: 403 });
  }

  const { playerId, flagged } = parsed.data;
  if (flagged) {
    await prisma.captainPlayerFlag.upsert({
      where: { draftId_teamId_playerId: { draftId, teamId: team.id, playerId } },
      update: {},
      create: { draftId, teamId: team.id, playerId },
    });
  } else {
    await prisma.captainPlayerFlag.deleteMany({
      where: { draftId, teamId: team.id, playerId },
    });
  }

  return NextResponse.json({ ok: true });
}

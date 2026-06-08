import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ draftId: string }> };

const starterSchema = z.object({
  teamId: z.string(),
  playerId: z.string(),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const parsed = starterSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { teamId, playerId } = parsed.data;
  const inPool = await prisma.draftPlayer.findUnique({
    where: { draftId_playerId: { draftId, playerId } },
  });
  if (!inPool) {
    return NextResponse.json({ error: "Player not in draft pool" }, { status: 400 });
  }

  const existingPick = await prisma.draftPick.findUnique({
    where: { draftId_playerId: { draftId, playerId } },
  });
  if (existingPick) {
    return NextResponse.json({ error: "Player already drafted" }, { status: 400 });
  }

  await prisma.draftStartingPlayer.upsert({
    where: { draftId_playerId: { draftId, playerId } },
    update: { teamId },
    create: { draftId, teamId, playerId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const playerId = new URL(request.url).searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  await prisma.draftStartingPlayer.deleteMany({ where: { draftId, playerId } });
  return NextResponse.json({ ok: true });
}

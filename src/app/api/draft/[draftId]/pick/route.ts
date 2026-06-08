import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSession } from "@/lib/auth";
import { recordPick } from "@/lib/draft/service";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ draftId: string }> };

const pickSchema = z.object({ playerId: z.string() });

export async function POST(request: Request, { params }: Params) {
  const session = await resolveSession();
  if (!session?.raterId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId } = await params;
  const parsed = pickSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const team = await prisma.draftTeam.findFirst({
    where: { draftId, raterId: session.raterId },
  });
  if (!team) {
    return NextResponse.json({ error: "Not a captain in this draft" }, { status: 403 });
  }

  try {
    const pick = await recordPick(draftId, team.id, parsed.data.playerId);
    return NextResponse.json({ pick });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pick failed" },
      { status: 400 },
    );
  }
}

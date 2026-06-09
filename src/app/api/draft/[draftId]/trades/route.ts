import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createTradeRequest } from "@/lib/draft/trades";

type Params = { params: Promise<{ draftId: string }> };

const createSchema = z.object({
  offeredPlayerId: z.string(),
  requestedPlayerId: z.string(),
});

export async function POST(request: Request, { params }: Params) {
  const session = await resolveSession();
  if (!session?.raterId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId } = await params;
  const parsed = createSchema.safeParse(await request.json());
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
    const trade = await createTradeRequest(
      draftId,
      team.id,
      parsed.data.offeredPlayerId,
      parsed.data.requestedPlayerId,
    );
    return NextResponse.json({ trade });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create trade request" },
      { status: 400 },
    );
  }
}

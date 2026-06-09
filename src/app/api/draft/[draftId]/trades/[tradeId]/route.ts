import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  acceptTradeRequest,
  cancelTradeRequest,
  rejectTradeRequest,
} from "@/lib/draft/trades";

type Params = { params: Promise<{ draftId: string; tradeId: string }> };

const actionSchema = z.object({
  action: z.enum(["accept", "reject", "cancel"]),
});

export async function PATCH(request: Request, { params }: Params) {
  const session = await resolveSession();
  if (!session?.raterId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId, tradeId } = await params;
  const parsed = actionSchema.safeParse(await request.json());
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
    if (parsed.data.action === "accept") {
      const trade = await acceptTradeRequest(draftId, tradeId, team.id);
      return NextResponse.json({ trade });
    }
    if (parsed.data.action === "reject") {
      const trade = await rejectTradeRequest(draftId, tradeId, team.id);
      return NextResponse.json({ trade });
    }
    const trade = await cancelTradeRequest(draftId, tradeId, team.id);
    return NextResponse.json({ trade });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update trade request" },
      { status: 400 },
    );
  }
}

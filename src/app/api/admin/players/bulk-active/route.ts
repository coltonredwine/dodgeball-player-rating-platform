import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperadmin } from "@/lib/api-auth";
import { syncCollectedSubmissionsForNewPlayers } from "@/lib/collection";
import { prisma } from "@/lib/db";

const bulkActiveSchema = z.object({
  playerIds: z.array(z.string().min(1)).min(1),
  active: z.boolean(),
});

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const leagueId = auth.session.leagueId;
  const parsed = bulkActiveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "playerIds and active are required" }, { status: 400 });
  }

  const { playerIds, active } = parsed.data;
  const result = await prisma.player.updateMany({
    where: {
      leagueId,
      id: { in: playerIds },
    },
    data: { active },
  });

  if (active) {
    await syncCollectedSubmissionsForNewPlayers(leagueId);
  }

  return NextResponse.json({ ok: true, updatedCount: result.count });
}

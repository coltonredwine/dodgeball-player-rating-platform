import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { recordPick } from "@/lib/draft/service";

type Params = { params: Promise<{ draftId: string }> };

const pickSchema = z.object({
  teamId: z.string(),
  playerId: z.string(),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const parsed = pickSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const pick = await recordPick(draftId, parsed.data.teamId, parsed.data.playerId, {
      force: true,
      anyTeam: true,
    });
    return NextResponse.json({ pick });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pick failed" },
      { status: 400 },
    );
  }
}

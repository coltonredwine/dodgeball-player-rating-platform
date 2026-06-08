import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSession } from "@/lib/auth";
import { isTeamColorAllowed } from "@/lib/draft/constants";
import { updateCaptainTeamColor } from "@/lib/draft/service";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ draftId: string }> };

const colorSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function PATCH(request: Request, { params }: Params) {
  const session = await resolveSession();
  if (!session?.raterId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId } = await params;
  const parsed = colorSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!isTeamColorAllowed(parsed.data.color)) {
    return NextResponse.json({ error: "Invalid team color" }, { status: 400 });
  }

  const team = await prisma.draftTeam.findFirst({
    where: { draftId, raterId: session.raterId },
  });
  if (!team) {
    return NextResponse.json({ error: "Not a captain in this draft" }, { status: 403 });
  }

  try {
    const updated = await updateCaptainTeamColor(draftId, team.id, parsed.data.color);
    return NextResponse.json({ color: updated.color });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update team color" },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { requireAdmin, requireBackendUser } from "@/lib/api-auth";
import { buildDraftState } from "@/lib/draft/service";

type Params = { params: Promise<{ draftId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireBackendUser();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const state = await buildDraftState(draftId);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(state);
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const body = await request.json();

  if (typeof body.isLive === "boolean") {
    const { prisma } = await import("@/lib/db");
    const draft = await prisma.draft.update({
      where: { id: draftId },
      data: {
        isLive: body.isLive,
        liveAt: body.isLive ? new Date() : null,
        onClockStartedAt: body.isLive ? new Date() : null,
        status: body.isLive ? "in_progress" : undefined,
      },
    });
    return NextResponse.json({ draft });
  }

  return NextResponse.json({ error: "Unsupported update" }, { status: 400 });
}

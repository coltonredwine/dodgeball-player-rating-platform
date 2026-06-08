import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { undoLastPick } from "@/lib/draft/service";

type Params = { params: Promise<{ draftId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const undone = await undoLastPick(draftId);
  if (!undone) {
    return NextResponse.json({ error: "No picks to undo" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, undonePickId: undone.id });
}

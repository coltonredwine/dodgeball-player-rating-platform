import { NextResponse } from "next/server";
import { buildDraftState } from "@/lib/draft/service";
import { redactPublicDraftState } from "@/lib/draft/public-board";

type Params = { params: Promise<{ draftId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { draftId } = await params;
  const state = await buildDraftState(draftId);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!state.draft.displaySettings.publicBoardEnabled) {
    return NextResponse.json({ error: "Public board disabled" }, { status: 404 });
  }

  return NextResponse.json(redactPublicDraftState(state, state.draft.displaySettings));
}

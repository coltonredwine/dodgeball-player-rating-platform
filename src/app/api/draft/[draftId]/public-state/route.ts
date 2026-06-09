import { NextResponse } from "next/server";
import { buildDraftState } from "@/lib/draft/service";
import { redactPendingTrades, redactPublicDraftState } from "@/lib/draft/public-board";
import { listPendingTradeRequests } from "@/lib/draft/trades";

type Params = { params: Promise<{ draftId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { draftId } = await params;
  const state = await buildDraftState(draftId);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!state.draft.displaySettings.publicBoardEnabled) {
    return NextResponse.json({ error: "Public board disabled" }, { status: 404 });
  }

  const pendingTrades =
    state.draft.status === "complete" ? await listPendingTradeRequests(draftId) : [];

  return NextResponse.json({
    ...redactPublicDraftState(state, state.draft.displaySettings),
    pendingTrades: redactPendingTrades(pendingTrades, state.draft.displaySettings),
  });
}

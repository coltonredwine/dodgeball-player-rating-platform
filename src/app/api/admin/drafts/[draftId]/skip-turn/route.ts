import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { skipDraftTurn } from "@/lib/draft/service";

type Params = { params: Promise<{ draftId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;

  try {
    const result = await skipDraftTurn(draftId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not skip turn" },
      { status: 400 },
    );
  }
}

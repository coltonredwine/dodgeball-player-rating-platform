import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { resetRaterScores } from "@/lib/rater-scores-admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ raterId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { raterId } = await params;
  await resetRaterScores(raterId);

  return NextResponse.json({ ok: true });
}

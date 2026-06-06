import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { setRaterAdminLocked } from "@/lib/rater-scores-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ raterId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { raterId } = await params;
  const body = (await request.json()) as { locked?: boolean };

  if (typeof body.locked !== "boolean") {
    return NextResponse.json({ error: "locked must be a boolean" }, { status: 400 });
  }

  const submission = await setRaterAdminLocked(raterId, body.locked);

  return NextResponse.json({
    submission: {
      id: submission.id,
      adminLocked: submission.adminLocked,
    },
  });
}

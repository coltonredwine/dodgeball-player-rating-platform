import { CollectionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  getActivePlayerCount,
  syncCollectedSubmissionsForNewPlayers,
  updateRaterCollectionStatus,
} from "@/lib/collection";

const VALID_STATUSES = new Set<string>(Object.values(CollectionStatus));

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ raterId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { raterId } = await params;
  const body = (await request.json()) as { status?: string };
  const status = body.status;

  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid collection status" }, { status: 400 });
  }

  const activePlayerCount = await getActivePlayerCount();
  await syncCollectedSubmissionsForNewPlayers(activePlayerCount);

  const submission = await updateRaterCollectionStatus(
    raterId,
    status as CollectionStatus,
    activePlayerCount,
  );

  return NextResponse.json({
    submission: {
      id: submission.id,
      collectionStatus: submission.collectionStatus,
      collectionStatusAt: submission.collectionStatusAt?.toISOString() ?? null,
      collectedActivePlayerCount: submission.collectedActivePlayerCount,
    },
  });
}

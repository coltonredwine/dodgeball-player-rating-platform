import { NextResponse } from "next/server";
import { requireBackendUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import {
  parseDraftRankThresholds,
  resolvePlayerScores,
  loadSeasonRatingsForPlayers,
} from "@/lib/rankings/compute-player";
import { MetricField } from "@/lib/constants";

type Params = { params: Promise<{ draftId: string; playerId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireBackendUser();
  if ("error" in auth) return auth.error;

  const leagueId = auth.session.leagueId;
  const { draftId, playerId } = await params;
  const draft = await prisma.draft.findFirst({
    where: { id: draftId, leagueId },
    include: {
      scoreExclusions: { where: { playerId } },
      scoreOverrides: { where: { playerId } },
    },
  });
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ratingsMap = await loadSeasonRatingsForPlayers(draft.leagueId, draft.seasonLabel, [
    playerId,
  ]);
  const ratings = ratingsMap.get(playerId) ?? [];

  const submissions = await prisma.ratingSubmission.findMany({
    where: {
      leagueId: draft.leagueId,
      seasonLabel: draft.seasonLabel,
      raterId: { in: ratings.map((r) => r.raterId) },
    },
    include: { rater: true },
  });
  const raterNameById = new Map(submissions.map((s) => [s.raterId, s.rater.name]));

  const excluded = new Set(
    draft.scoreExclusions.filter((e) => e.playerId === playerId).map((e) => e.raterId),
  );
  const overrides: Partial<Record<MetricField, number>> = {};
  for (const o of draft.scoreOverrides) {
    overrides[o.metric as MetricField] = o.value;
  }

  const thresholds = parseDraftRankThresholds(draft.rankThresholds);
  const { averages, scores } = resolvePlayerScores(ratings, excluded, overrides, thresholds);

  return NextResponse.json({
    raterScores: ratings.map((r) => ({
      raterId: r.raterId,
      raterName: raterNameById.get(r.raterId) ?? "Unknown",
      excluded: excluded.has(r.raterId),
      power: r.power,
      accuracy: r.accuracy,
      intimidation: r.intimidation,
      catching: r.catching,
      evasion: r.evasion,
      nerve: r.nerve,
    })),
    averages,
    overrides,
    scores,
  });
}

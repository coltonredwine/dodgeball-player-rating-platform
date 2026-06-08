import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { buildDraftState } from "@/lib/draft/service";
import { sortDraftPlayers } from "@/lib/draft/sort";
import { MetricField } from "@/lib/constants";

type Params = { params: Promise<{ draftId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const state = await buildDraftState(draftId);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const players = sortDraftPlayers(
    [...state.undrafted, ...state.drafted],
    state.draft.displaySettings,
  );

  return NextResponse.json({
    players: players.map((p) => ({
      ...p,
      scores: {
        metrics: p.scores!.metrics,
        offensive: p.scores!.offensive,
        defensive: p.scores!.defensive,
        psych: p.scores!.psych,
        overall: p.scores!.overall,
        rank: p.scores!.rank,
        leaning: p.scores!.leaning,
        displayOffensive: p.scores!.displayOffensive,
        displayDefensive: p.scores!.displayDefensive,
        displayPsych: p.scores!.displayPsych,
      },
    })),
  });
}

const exclusionSchema = z.object({
  playerId: z.string(),
  raterId: z.string(),
  excluded: z.boolean(),
});

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const parsed = exclusionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { playerId, raterId, excluded } = parsed.data;
  if (excluded) {
    await prisma.draftScoreExclusion.upsert({
      where: { draftId_playerId_raterId: { draftId, playerId, raterId } },
      update: {},
      create: { draftId, playerId, raterId },
    });
  } else {
    await prisma.draftScoreExclusion.deleteMany({ where: { draftId, playerId, raterId } });
  }

  return NextResponse.json({ ok: true });
}

const overrideSchema = z.object({
  playerId: z.string(),
  metric: z.enum(["power", "accuracy", "intimidation", "catching", "evasion", "nerve"]),
  value: z.number().min(1).max(7).nullable(),
});

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const parsed = overrideSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { playerId, metric, value } = parsed.data;
  if (value == null) {
    await prisma.draftScoreOverride.deleteMany({
      where: { draftId, playerId, metric: metric as MetricField },
    });
  } else {
    await prisma.draftScoreOverride.upsert({
      where: { draftId_playerId_metric: { draftId, playerId, metric } },
      update: { value },
      create: { draftId, playerId, metric, value },
    });
  }

  return NextResponse.json({ ok: true });
}

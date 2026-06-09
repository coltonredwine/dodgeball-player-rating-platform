import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { serializeDisplaySettings } from "@/lib/draft/constants";
import { prisma } from "@/lib/db";
import { updateDraftTeamCaptains } from "@/lib/draft/service";
import { serializeRankThresholds } from "@/lib/rankings/thresholds";

type Params = { params: Promise<{ draftId: string }> };

const settingsSchema = z.object({
  rankThresholds: z
    .object({
      "2": z.number(),
      "3": z.number(),
      "4": z.number(),
      "5": z.number(),
    })
    .optional(),
  minQuotasEnabled: z.boolean().optional(),
  maxQuotasEnabled: z.boolean().optional(),
  displaySettings: z
    .object({
      showRanksOnCaptainView: z.boolean(),
      hideRanksOnCompleteTeams: z.boolean(),
      primarySort: z.enum(["rank", "calculation", "firstName", "lastName"]),
      secondarySort: z.enum(["rank", "calculation", "firstName", "lastName"]),
      publicBoardEnabled: z.boolean(),
      publicShowRanks: z.boolean(),
      publicShowSkillRatings: z.boolean(),
      publicTeamSort: z.enum(["pickOrder", "avgRank"]),
    })
    .optional(),
  teams: z
    .array(
      z.object({
        id: z.string(),
        pickOrder: z.number().int().min(1),
        color: z.string(),
        raterId: z.string(),
      }),
    )
    .optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { draftId } = await params;
  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const draft = await prisma.draft.update({
    where: { id: draftId },
    data: {
      rankThresholds: data.rankThresholds
        ? serializeRankThresholds(data.rankThresholds)
        : undefined,
      minQuotasEnabled: data.minQuotasEnabled,
      maxQuotasEnabled: data.maxQuotasEnabled,
      displaySettings: data.displaySettings
        ? serializeDisplaySettings(data.displaySettings)
        : undefined,
    },
  });

  if (data.teams) {
    try {
      await updateDraftTeamCaptains(
        draftId,
        data.teams.map((team) => ({ id: team.id, raterId: team.raterId })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update captains";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    for (const team of data.teams) {
      await prisma.draftTeam.update({
        where: { id: team.id },
        data: {
          pickOrder: team.pickOrder,
          color: team.color,
        },
      });
    }
  }

  return NextResponse.json({ draft });
}

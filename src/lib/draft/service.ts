import { MetricField } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { defaultTeamColor, isTeamColorAllowed, parseDisplaySettings } from "@/lib/draft/constants";
import { sortDraftPlayers } from "@/lib/draft/sort";
import {
  canPickRank,
  computeRankQuotas,
  computeRemainingPicks,
  computeTeamRosterTargets,
  countRanksInPool,
  quotaCapForTeam,
  rankNeedForTeam,
} from "@/lib/draft/quotas";
import { buildTurnQueue, getTeamForPick, pickNumberToRound } from "@/lib/draft/snake";
import {
  computeTeamStats,
  loadSeasonRatingsForPlayers,
  parseDraftRankThresholds,
  resolvePlayerScores,
} from "@/lib/rankings/compute-player";
import { ComputedPlayerScores } from "@/lib/rankings/compute-metrics";
import { DEFAULT_RANK_THRESHOLDS, serializeRankThresholds } from "@/lib/rankings/thresholds";

export type DraftPlayerComputed = {
  playerId: string;
  firstName: string;
  lastName: string;
  link: string | null;
  scores: ComputedPlayerScores;
  drafted: boolean;
  teamId: string | null;
  isStarter: boolean;
};

export type DraftTeamComputed = {
  id: string;
  raterId: string;
  captainName: string;
  pickOrder: number;
  color: string;
  roster: Array<{
    playerId: string;
    firstName: string;
    lastName: string;
    link: string | null;
    rank: number;
    leaning: "offensive" | "defensive";
    displayOffensive: number;
    displayDefensive: number;
    displayPsych: number;
    isStarter: boolean;
  }>;
  stats: ReturnType<typeof computeTeamStats>;
  rankCounts: Record<number, number>;
  quotaNeed: Record<number, number>;
  quotaCap: Record<number, number>;
  targetRosterSize: number;
  remainingPicks: number;
};

export type PickHistoryEntry = {
  pickNumber: number;
  teamId: string;
  captainName: string;
  playerId: string;
  firstName: string;
  lastName: string;
};

export type DraftState = {
  draft: {
    id: string;
    name: string;
    seasonLabel: string;
    status: string;
    isLive: boolean;
    onClockStartedAt: string | null;
    teamCount: number;
    minQuotasEnabled: boolean;
    maxQuotasEnabled: boolean;
    rankThresholds: ReturnType<typeof parseDraftRankThresholds>;
    displaySettings: ReturnType<typeof parseDisplaySettings>;
  };
  currentPickNumber: number;
  totalPicks: number;
  onClockTeamId: string | null;
  turnQueue: ReturnType<typeof buildTurnQueue>;
  pickHistory: PickHistoryEntry[];
  undrafted: DraftPlayerComputed[];
  drafted: DraftPlayerComputed[];
  teams: DraftTeamComputed[];
  rankPoolCounts: Record<number, number>;
  undraftedRankCounts: Record<number, number>;
  quotas: ReturnType<typeof computeRankQuotas>;
  undraftedTotal: number;
};

export async function getDraftRecord(draftId: string) {
  return prisma.draft.findUnique({
    where: { id: draftId },
    include: {
      players: { include: { player: true } },
      teams: { include: { rater: true }, orderBy: { pickOrder: "asc" } },
      startingPlayers: true,
      picks: { orderBy: { pickNumber: "asc" } },
      scoreExclusions: true,
      scoreOverrides: true,
    },
  });
}

export async function buildDraftState(draftId: string): Promise<DraftState | null> {
  const draft = await getDraftRecord(draftId);
  if (!draft) return null;

  const playerIds = draft.players.map((p) => p.playerId);
  const thresholds = parseDraftRankThresholds(draft.rankThresholds);
  const displaySettings = parseDisplaySettings(draft.displaySettings);
  const ratingsByPlayer = await loadSeasonRatingsForPlayers(draft.seasonLabel, playerIds);

  const exclusionsByPlayer = new Map<string, Set<string>>();
  for (const exclusion of draft.scoreExclusions) {
    const set = exclusionsByPlayer.get(exclusion.playerId) ?? new Set<string>();
    set.add(exclusion.raterId);
    exclusionsByPlayer.set(exclusion.playerId, set);
  }

  const overridesByPlayer = new Map<string, Partial<Record<MetricField, number>>>();
  for (const override of draft.scoreOverrides) {
    const metrics = overridesByPlayer.get(override.playerId) ?? {};
    metrics[override.metric as MetricField] = override.value;
    overridesByPlayer.set(override.playerId, metrics);
  }

  const starterTeamByPlayer = new Map(
    draft.startingPlayers.map((s) => [s.playerId, s.teamId]),
  );
  const pickTeamByPlayer = new Map(draft.picks.map((p) => [p.playerId, p.teamId]));

  const computedPlayers: DraftPlayerComputed[] = draft.players.map(({ player }) => {
    const ratings = ratingsByPlayer.get(player.id) ?? [];
    const { scores } = resolvePlayerScores(
      ratings,
      exclusionsByPlayer.get(player.id) ?? new Set(),
      overridesByPlayer.get(player.id) ?? {},
      thresholds,
    );
    const teamId = pickTeamByPlayer.get(player.id) ?? starterTeamByPlayer.get(player.id) ?? null;
    return {
      playerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      link: player.link,
      scores,
      drafted: pickTeamByPlayer.has(player.id) || starterTeamByPlayer.has(player.id),
      teamId,
      isStarter: starterTeamByPlayer.has(player.id),
    };
  });

  const playerMap = new Map(computedPlayers.map((p) => [p.playerId, p]));
  const undrafted = computedPlayers.filter((p) => !p.drafted);
  const drafted = computedPlayers.filter((p) => p.drafted);

  const ranks = computedPlayers
    .map((p) => p.scores?.rank)
    .filter((r): r is number => r != null);
  const rankPoolCounts = countRanksInPool(ranks);
  const undraftedRankCounts = countRanksInPool(
    undrafted.map((p) => p.scores?.rank).filter((r): r is number => r != null),
  );
  const quotas = computeRankQuotas(rankPoolCounts, draft.teamCount);

  const pickOrders = draft.teams.map((t) => t.pickOrder);
  const rosterTargets = computeTeamRosterTargets(
    draft.players.length,
    draft.teamCount,
    pickOrders,
  );

  const teamsBase = draft.teams.map((team) => {
    const starters = draft.startingPlayers.filter((s) => s.teamId === team.id);
    const picks = draft.picks.filter((p) => p.teamId === team.id);
    const rosterEntries = [...starters.map((s) => ({ playerId: s.playerId, isStarter: true })), ...picks.map((p) => ({ playerId: p.playerId, isStarter: false }))];

    const roster = rosterEntries
      .map(({ playerId, isStarter }) => {
        const player = playerMap.get(playerId);
        if (!player?.scores) return null;
        return {
          playerId,
          firstName: player.firstName,
          lastName: player.lastName,
          link: player.link,
          rank: player.scores.rank,
          leaning: player.scores.leaning,
          displayOffensive: player.scores.displayOffensive,
          displayDefensive: player.scores.displayDefensive,
          displayPsych: player.scores.displayPsych,
          isStarter,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);

    const rankCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const entry of roster) {
      rankCounts[entry.rank] = (rankCounts[entry.rank] ?? 0) + 1;
    }

    const quotaNeed: Record<number, number> = {};
    for (let rank = 1; rank <= 5; rank++) {
      quotaNeed[rank] = rankNeedForTeam(
        rankCounts[rank] ?? 0,
        rank,
        quotas,
        draft.minQuotasEnabled,
      );
    }

    const targetRosterSize = rosterTargets.get(team.pickOrder) ?? Math.floor(draft.players.length / draft.teamCount);
    const remainingPicks = computeRemainingPicks(targetRosterSize, roster.length);

    return {
      id: team.id,
      raterId: team.raterId,
      captainName: team.rater.name,
      pickOrder: team.pickOrder,
      color: team.color,
      roster,
      stats: computeTeamStats(
        roster.map((r) => ({
          rank: r.rank,
          displayOffensive: r.displayOffensive,
          displayDefensive: r.displayDefensive,
        })),
      ),
      rankCounts,
      quotaNeed,
      targetRosterSize,
      remainingPicks,
    };
  });

  const teams: DraftTeamComputed[] = teamsBase.map((team) => {
    const quotaCap: Record<number, number> = {};
    for (let rank = 1; rank <= 5; rank++) {
      quotaCap[rank] = quotaCapForTeam(
        team.id,
        rank,
        team.rankCounts[rank] ?? 0,
        teamsBase,
        undraftedRankCounts,
        quotas,
        draft.minQuotasEnabled,
        draft.maxQuotasEnabled,
      );
    }
    return { ...team, quotaCap };
  });

  const currentPickNumber = draft.picks.length + 1;
  const totalPicks = draft.players.length - draft.startingPlayers.length;
  const onClockTeam =
    currentPickNumber <= totalPicks
      ? getTeamForPick(
          currentPickNumber,
          draft.teams.map((t) => ({ id: t.id, pickOrder: t.pickOrder })),
        )
      : null;

  const teamNameById = new Map(draft.teams.map((t) => [t.id, t.rater.name]));
  const pickHistory: PickHistoryEntry[] = draft.picks.map((pick) => {
    const player = playerMap.get(pick.playerId);
    return {
      pickNumber: pick.pickNumber,
      teamId: pick.teamId,
      captainName: teamNameById.get(pick.teamId) ?? "Unknown",
      playerId: pick.playerId,
      firstName: player?.firstName ?? "",
      lastName: player?.lastName ?? "",
    };
  });

  return {
    draft: {
      id: draft.id,
      name: draft.name,
      seasonLabel: draft.seasonLabel,
      status: draft.status,
      isLive: draft.isLive,
      onClockStartedAt: draft.onClockStartedAt?.toISOString() ?? null,
      teamCount: draft.teamCount,
      minQuotasEnabled: draft.minQuotasEnabled,
      maxQuotasEnabled: draft.maxQuotasEnabled,
      rankThresholds: thresholds,
      displaySettings,
    },
    currentPickNumber: Math.min(currentPickNumber, totalPicks + 1),
    totalPicks,
    onClockTeamId: onClockTeam?.id ?? null,
    turnQueue: buildTurnQueue(
      currentPickNumber,
      draft.teams.map((t) => ({ id: t.id, pickOrder: t.pickOrder })),
      8,
      totalPicks,
    ),
    pickHistory,
    undrafted: sortDraftPlayers(undrafted, displaySettings),
    drafted,
    teams,
    rankPoolCounts,
    undraftedRankCounts,
    quotas,
    undraftedTotal: undrafted.length,
  };
}

export function canTeamPickPlayer(
  state: DraftState,
  teamId: string,
  playerId: string,
): boolean {
  const team = state.teams.find((t) => t.id === teamId);
  const player = state.undrafted.find((p) => p.playerId === playerId);
  if (!team || !player?.scores) return false;
  if (team.remainingPicks <= 0) return false;
  return canPickRank(
    teamId,
    player.scores.rank,
    team.rankCounts[player.scores.rank] ?? 0,
    state.teams,
    state.undraftedRankCounts,
    state.quotas,
    state.draft.minQuotasEnabled,
    state.draft.maxQuotasEnabled,
  );
}

export async function createDraft(input: {
  name: string;
  seasonLabel: string;
  teamCount: number;
  playerIds: string[];
  captains: Array<{ raterId: string; pickOrder: number }>;
}) {
  return prisma.draft.create({
    data: {
      name: input.name.trim(),
      seasonLabel: input.seasonLabel,
      teamCount: input.teamCount,
      rankThresholds: serializeRankThresholds(DEFAULT_RANK_THRESHOLDS),
      players: {
        create: input.playerIds.map((playerId) => ({ playerId })),
      },
      teams: {
        create: input.captains.map((captain, index) => ({
          raterId: captain.raterId,
          pickOrder: captain.pickOrder,
          color: defaultTeamColor(index),
        })),
      },
    },
  });
}

export async function recordPick(
  draftId: string,
  teamId: string,
  playerId: string,
  options?: { force?: boolean },
) {
  const draft = await getDraftRecord(draftId);
  if (!draft) throw new Error("Draft not found");

  const state = await buildDraftState(draftId);
  if (!state) throw new Error("Draft not found");
  if (!draft.isLive) throw new Error("Draft is not live");
  if (state.onClockTeamId !== teamId) throw new Error("Not this team's turn");

  const player = state.undrafted.find((p) => p.playerId === playerId);
  if (!player) throw new Error("Player not available");

  if (!options?.force && !canTeamPickPlayer(state, teamId, playerId)) {
    throw new Error("Pick not allowed");
  }

  const pickNumber = draft.picks.length + 1;
  const round = pickNumberToRound(pickNumber, draft.teamCount);

  const pick = await prisma.draftPick.create({
    data: {
      draftId,
      teamId,
      playerId,
      pickNumber,
      round,
    },
  });

  const updated = await getDraftRecord(draftId);
  const totalPicks = (updated?.players.length ?? 0) - (updated?.startingPlayers.length ?? 0);
  const draftComplete = updated && updated.picks.length >= totalPicks;

  if (draftComplete) {
    await prisma.draft.update({
      where: { id: draftId },
      data: { status: "complete", completedAt: new Date(), onClockStartedAt: null },
    });
  } else {
    await prisma.draft.update({
      where: { id: draftId },
      data: {
        onClockStartedAt: new Date(),
        ...(updated?.status === "setup" ? { status: "in_progress" as const } : {}),
      },
    });
  }

  return pick;
}

export async function addPlayerToDraft(draftId: string, playerId: string) {
  const draft = await prisma.draft.findUnique({ where: { id: draftId } });
  if (!draft) throw new Error("Draft not found");
  if (draft.status === "complete") throw new Error("Cannot modify a completed draft");

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error("Player not found");

  const existing = await prisma.draftPlayer.findUnique({
    where: { draftId_playerId: { draftId, playerId } },
  });
  if (existing) throw new Error("Player already in draft pool");

  return prisma.draftPlayer.create({ data: { draftId, playerId } });
}

export async function removePlayerFromDraft(draftId: string, playerId: string) {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { players: true, picks: true },
  });
  if (!draft) throw new Error("Draft not found");
  if (draft.status === "complete") throw new Error("Cannot modify a completed draft");

  const inPool = await prisma.draftPlayer.findUnique({
    where: { draftId_playerId: { draftId, playerId } },
  });
  if (!inPool) throw new Error("Player not in draft pool");

  const pick = await prisma.draftPick.findUnique({
    where: { draftId_playerId: { draftId, playerId } },
  });
  if (pick) throw new Error("Cannot remove a player who has been drafted");

  if (draft.players.length <= 1) {
    throw new Error("Draft pool must include at least one player");
  }

  await prisma.$transaction([
    prisma.draftStartingPlayer.deleteMany({ where: { draftId, playerId } }),
    prisma.draftScoreExclusion.deleteMany({ where: { draftId, playerId } }),
    prisma.draftScoreOverride.deleteMany({ where: { draftId, playerId } }),
    prisma.captainPlayerFlag.deleteMany({ where: { draftId, playerId } }),
    prisma.draftPlayer.delete({ where: { draftId_playerId: { draftId, playerId } } }),
  ]);
}

async function findBufferRaterId(assignedRaterIds: Set<string>) {
  const buffer = await prisma.rater.findFirst({
    where: { id: { notIn: [...assignedRaterIds] } },
    select: { id: true },
    orderBy: { name: "asc" },
  });
  return buffer?.id ?? null;
}

export async function updateDraftTeamCaptain(draftId: string, teamId: string, newRaterId: string) {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { teams: { include: { rater: true } } },
  });
  if (!draft) throw new Error("Draft not found");
  if (draft.status === "complete") throw new Error("Cannot modify a completed draft");

  const team = draft.teams.find((entry) => entry.id === teamId);
  if (!team) throw new Error("Team not found");
  if (team.raterId === newRaterId) return team;

  const rater = await prisma.rater.findUnique({ where: { id: newRaterId } });
  if (!rater) throw new Error("Captain not found");

  const conflict = draft.teams.find((entry) => entry.id !== teamId && entry.raterId === newRaterId);
  if (!conflict) {
    return prisma.draftTeam.update({
      where: { id: teamId },
      data: { raterId: newRaterId },
      include: { rater: true },
    });
  }

  const assignedRaterIds = new Set(draft.teams.map((entry) => entry.raterId));
  const bufferRaterId = await findBufferRaterId(assignedRaterIds);
  if (!bufferRaterId) {
    throw new Error("No available rater to swap captains. Choose a captain not already assigned.");
  }

  const oldRaterId = team.raterId;
  await prisma.$transaction([
    prisma.draftTeam.update({ where: { id: teamId }, data: { raterId: bufferRaterId } }),
    prisma.draftTeam.update({ where: { id: conflict.id }, data: { raterId: oldRaterId } }),
    prisma.draftTeam.update({ where: { id: teamId }, data: { raterId: newRaterId } }),
  ]);

  return prisma.draftTeam.findUnique({
    where: { id: teamId },
    include: { rater: true },
  });
}

export async function updateDraftTeamCaptains(
  draftId: string,
  updates: Array<{ id: string; raterId: string; color?: string }>,
) {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { teams: true },
  });
  if (!draft) throw new Error("Draft not found");
  if (draft.status === "complete") throw new Error("Cannot modify a completed draft");
  if (updates.length !== draft.teams.length) throw new Error("Invalid team update");

  const draftTeamIds = new Set(draft.teams.map((team) => team.id));
  const raterIds = updates.map((team) => team.raterId);
  if (new Set(raterIds).size !== raterIds.length) {
    throw new Error("Each captain must be assigned to only one team");
  }

  for (const update of updates) {
    if (!draftTeamIds.has(update.id)) throw new Error("Invalid team");
  }

  const raters = await prisma.rater.findMany({ where: { id: { in: raterIds } } });
  if (raters.length !== raterIds.length) throw new Error("Invalid captain selection");

  for (const update of updates) {
    const current = await prisma.draftTeam.findUnique({ where: { id: update.id } });
    if (current?.raterId !== update.raterId) {
      await updateDraftTeamCaptain(draftId, update.id, update.raterId);
    }
  }

  for (const update of updates) {
    if (!update.color) continue;
    if (!isTeamColorAllowed(update.color)) {
      throw new Error("Invalid team color");
    }
  }

  const colorByTeam = new Map(draft.teams.map((team) => [team.id, team.color]));
  for (const update of updates) {
    if (update.color) {
      colorByTeam.set(update.id, update.color);
    }
  }
  const usedColors = new Set<string>();
  for (const color of colorByTeam.values()) {
    if (usedColors.has(color)) {
      throw new Error("Each team must have a unique color");
    }
    usedColors.add(color);
  }

  for (const update of updates) {
    if (!update.color) continue;
    const current = await prisma.draftTeam.findUnique({ where: { id: update.id } });
    if (current && current.color !== update.color) {
      await prisma.draftTeam.update({
        where: { id: update.id },
        data: { color: update.color },
      });
    }
  }
}

export async function updateCaptainTeamColor(
  draftId: string,
  teamId: string,
  color: string,
) {
  if (!isTeamColorAllowed(color)) {
    throw new Error("Invalid team color");
  }

  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { teams: true },
  });
  if (!draft) throw new Error("Draft not found");
  if (draft.status === "complete") {
    throw new Error("Cannot change color on a completed draft");
  }

  const team = draft.teams.find((entry) => entry.id === teamId);
  if (!team) throw new Error("Team not found");

  const conflict = draft.teams.find(
    (entry) => entry.id !== teamId && entry.color === color,
  );
  if (conflict) {
    throw new Error("That color is already taken by another captain");
  }

  if (team.color === color) return team;

  return prisma.draftTeam.update({
    where: { id: teamId },
    data: { color },
  });
}

export async function undoLastPick(draftId: string) {
  const lastPick = await prisma.draftPick.findFirst({
    where: { draftId },
    orderBy: { pickNumber: "desc" },
  });
  if (!lastPick) return null;
  await prisma.draftPick.delete({ where: { id: lastPick.id } });
  await prisma.draft.update({
    where: { id: draftId },
    data: {
      status: "in_progress",
      isLive: true,
      completedAt: null,
      onClockStartedAt: new Date(),
    },
  });
  return lastPick;
}

export async function getCaptainAssignmentsForRater(raterId: string) {
  return prisma.draftTeam.findMany({
    where: {
      raterId,
      draft: { status: { not: "complete" } },
    },
    include: { draft: true },
    orderBy: { draft: { createdAt: "desc" } },
  });
}

export function isDraftOpen(draft: { status: string }) {
  return draft.status !== "complete";
}

export async function countOpenDrafts() {
  return prisma.draft.count({ where: { status: { not: "complete" } } });
}

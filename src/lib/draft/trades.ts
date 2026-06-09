import { prisma } from "@/lib/db";
import type { DraftState } from "@/lib/draft/service";
import {
  canExecuteTradeSwap,
  getTradeEligibleOfferPlayerIds,
  getTradeEligibleTargetPlayerIds,
  validateRosterMove,
  type RosterMoveValidation,
} from "@/lib/draft/trade-validation";

export type TradeRequestSummary = {
  id: string;
  proposingTeamId: string;
  counterpartyTeamId: string;
  offeredPlayerId: string;
  requestedPlayerId: string;
  proposingCaptainName: string;
  counterpartyCaptainName: string;
  proposingTeamColor: string;
  offeredPlayer: {
    playerId: string;
    firstName: string;
    lastName: string;
    rank: number;
    link: string | null;
  };
  requestedPlayer: {
    playerId: string;
    firstName: string;
    lastName: string;
    rank: number;
    link: string | null;
  };
};

function findRosterPlayer(state: DraftState, playerId: string) {
  for (const team of state.teams) {
    const player = team.roster.find((entry) => entry.playerId === playerId);
    if (player) return { team, player };
  }
  return null;
}

export {
  canExecuteTradeSwap,
  getTradeEligibleOfferPlayerIds,
  getTradeEligibleTargetPlayerIds,
  validateRosterMove,
  type RosterMoveValidation,
};

async function updatePlayerTeamOwnership(
  draftId: string,
  playerId: string,
  toTeamId: string,
) {
  const pick = await prisma.draftPick.findUnique({
    where: { draftId_playerId: { draftId, playerId } },
  });
  if (pick) {
    await prisma.draftPick.update({
      where: { id: pick.id },
      data: { teamId: toTeamId },
    });
    return;
  }

  const starter = await prisma.draftStartingPlayer.findUnique({
    where: { draftId_playerId: { draftId, playerId } },
  });
  if (starter) {
    await prisma.draftStartingPlayer.update({
      where: { id: starter.id },
      data: { teamId: toTeamId },
    });
    return;
  }

  throw new Error("Player is not on a roster");
}

async function cancelPendingTradesForPlayers(draftId: string, playerIds: string[]) {
  if (playerIds.length === 0) return;
  await prisma.draftTradeRequest.updateMany({
    where: {
      draftId,
      status: "pending",
      OR: [
        { offeredPlayerId: { in: playerIds } },
        { requestedPlayerId: { in: playerIds } },
      ],
    },
    data: { status: "cancelled", resolvedAt: new Date() },
  });
}

export async function executePlayerSwap(
  draftId: string,
  offeredPlayerId: string,
  requestedPlayerId: string,
  options?: { preserveTradeId?: string },
) {
  const { buildDraftState } = await import("@/lib/draft/service");
  const state = await buildDraftState(draftId);
  if (!state) throw new Error("Draft not found");
  if (state.draft.status !== "complete") throw new Error("Trades are only available after the draft");

  const offered = findRosterPlayer(state, offeredPlayerId);
  const requested = findRosterPlayer(state, requestedPlayerId);
  if (!offered || !requested) throw new Error("Players must be on rosters");
  if (offered.team.id === requested.team.id) throw new Error("Players must be on different teams");

  if (
    !canExecuteTradeSwap(
      state,
      offered.team.id,
      offeredPlayerId,
      requestedPlayerId,
    )
  ) {
    throw new Error("Trade would violate rank quotas");
  }

  const offeredTeamId = offered.team.id;
  const requestedTeamId = requested.team.id;

  await prisma.$transaction(async (tx) => {
    const offeredPick = await tx.draftPick.findUnique({
      where: { draftId_playerId: { draftId, playerId: offeredPlayerId } },
    });
    const requestedPick = await tx.draftPick.findUnique({
      where: { draftId_playerId: { draftId, playerId: requestedPlayerId } },
    });

    if (offeredPick) {
      await tx.draftPick.update({
        where: { id: offeredPick.id },
        data: { teamId: requestedTeamId },
      });
    } else {
      await tx.draftStartingPlayer.update({
        where: { draftId_playerId: { draftId, playerId: offeredPlayerId } },
        data: { teamId: requestedTeamId },
      });
    }

    if (requestedPick) {
      await tx.draftPick.update({
        where: { id: requestedPick.id },
        data: { teamId: offeredTeamId },
      });
    } else {
      await tx.draftStartingPlayer.update({
        where: { draftId_playerId: { draftId, playerId: requestedPlayerId } },
        data: { teamId: offeredTeamId },
      });
    }

    await tx.captainPlayerFlag.deleteMany({
      where: {
        draftId,
        playerId: { in: [offeredPlayerId, requestedPlayerId] },
      },
    });

    await tx.draftTradeRequest.updateMany({
      where: {
        draftId,
        status: "pending",
        ...(options?.preserveTradeId ? { id: { not: options.preserveTradeId } } : {}),
        OR: [
          { offeredPlayerId: { in: [offeredPlayerId, requestedPlayerId] } },
          { requestedPlayerId: { in: [offeredPlayerId, requestedPlayerId] } },
        ],
      },
      data: { status: "cancelled", resolvedAt: new Date() },
    });
  });
}

export async function movePlayerToTeam(
  draftId: string,
  playerId: string,
  toTeamId: string,
  options?: { force?: boolean },
) {
  const { buildDraftState } = await import("@/lib/draft/service");
  const state = await buildDraftState(draftId);
  if (!state) throw new Error("Draft not found");

  const validation = validateRosterMove(state, playerId, toTeamId);
  if (!validation.allowed && !options?.force) {
    throw new Error(validation.violations[0] ?? "Move not allowed");
  }

  await updatePlayerTeamOwnership(draftId, playerId, toTeamId);
  await prisma.captainPlayerFlag.deleteMany({ where: { draftId, playerId } });
  await cancelPendingTradesForPlayers(draftId, [playerId]);
}

export async function listPendingTradeRequests(draftId: string): Promise<TradeRequestSummary[]> {
  const trades = await prisma.draftTradeRequest.findMany({
    where: { draftId, status: "pending" },
    include: {
      proposingTeam: { include: { rater: true } },
      counterpartyTeam: { include: { rater: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const { buildDraftState } = await import("@/lib/draft/service");
  const state = await buildDraftState(draftId);
  if (!state) return [];

  return trades.flatMap((trade) => {
    const offered = findRosterPlayer(state, trade.offeredPlayerId);
    const requested = findRosterPlayer(state, trade.requestedPlayerId);
    if (!offered || !requested) return [];

    return [
      {
        id: trade.id,
        proposingTeamId: trade.proposingTeamId,
        counterpartyTeamId: trade.counterpartyTeamId,
        offeredPlayerId: trade.offeredPlayerId,
        requestedPlayerId: trade.requestedPlayerId,
        proposingCaptainName: trade.proposingTeam.rater.name,
        counterpartyCaptainName: trade.counterpartyTeam.rater.name,
        proposingTeamColor: trade.proposingTeam.color,
        offeredPlayer: {
          playerId: offered.player.playerId,
          firstName: offered.player.firstName,
          lastName: offered.player.lastName,
          rank: offered.player.rank,
          link: offered.player.link,
        },
        requestedPlayer: {
          playerId: requested.player.playerId,
          firstName: requested.player.firstName,
          lastName: requested.player.lastName,
          rank: requested.player.rank,
          link: requested.player.link,
        },
      },
    ];
  });
}

export async function createTradeRequest(
  draftId: string,
  proposingTeamId: string,
  offeredPlayerId: string,
  requestedPlayerId: string,
) {
  const { buildDraftState } = await import("@/lib/draft/service");
  const state = await buildDraftState(draftId);
  if (!state) throw new Error("Draft not found");
  if (state.draft.status !== "complete") throw new Error("Trades are only available after the draft");

  const requested = findRosterPlayer(state, requestedPlayerId);
  if (!requested || requested.team.id === proposingTeamId) {
    throw new Error("Invalid trade target");
  }

  const offered = findRosterPlayer(state, offeredPlayerId);
  if (!offered || offered.team.id !== proposingTeamId) {
    throw new Error("Invalid trade offer");
  }
  if (offered.player.isStarter || requested.player.isStarter) {
    throw new Error("Starting players cannot be traded");
  }

  if (
    !canExecuteTradeSwap(state, proposingTeamId, offeredPlayerId, requestedPlayerId)
  ) {
    throw new Error("Trade would violate rank quotas");
  }

  const existingOutgoing = await prisma.draftTradeRequest.findFirst({
    where: { draftId, proposingTeamId, status: "pending" },
  });
  if (existingOutgoing) {
    throw new Error("You already have a pending trade request");
  }

  const conflicting = await prisma.draftTradeRequest.findFirst({
    where: {
      draftId,
      status: "pending",
      OR: [
        { offeredPlayerId: { in: [offeredPlayerId, requestedPlayerId] } },
        { requestedPlayerId: { in: [offeredPlayerId, requestedPlayerId] } },
      ],
    },
  });
  if (conflicting) {
    throw new Error("One of these players is already involved in a pending trade");
  }

  return prisma.draftTradeRequest.create({
    data: {
      draftId,
      proposingTeamId,
      counterpartyTeamId: requested.team.id,
      offeredPlayerId,
      requestedPlayerId,
    },
  });
}

export async function acceptTradeRequest(
  draftId: string,
  tradeId: string,
  counterpartyTeamId: string,
) {
  const trade = await prisma.draftTradeRequest.findUnique({ where: { id: tradeId } });
  if (!trade || trade.draftId !== draftId) throw new Error("Trade request not found");
  if (trade.status !== "pending") throw new Error("Trade request is no longer pending");
  if (trade.counterpartyTeamId !== counterpartyTeamId) {
    throw new Error("Not authorized to accept this trade");
  }

  await executePlayerSwap(
    draftId,
    trade.offeredPlayerId,
    trade.requestedPlayerId,
    { preserveTradeId: tradeId },
  );

  return prisma.draftTradeRequest.update({
    where: { id: tradeId },
    data: { status: "accepted", resolvedAt: new Date() },
  });
}

export async function rejectTradeRequest(
  draftId: string,
  tradeId: string,
  counterpartyTeamId: string,
) {
  const trade = await prisma.draftTradeRequest.findUnique({ where: { id: tradeId } });
  if (!trade || trade.draftId !== draftId) throw new Error("Trade request not found");
  if (trade.status !== "pending") throw new Error("Trade request is no longer pending");
  if (trade.counterpartyTeamId !== counterpartyTeamId) {
    throw new Error("Not authorized to reject this trade");
  }

  return prisma.draftTradeRequest.update({
    where: { id: tradeId },
    data: { status: "rejected", resolvedAt: new Date() },
  });
}

export async function cancelTradeRequest(
  draftId: string,
  tradeId: string,
  proposingTeamId: string,
) {
  const trade = await prisma.draftTradeRequest.findUnique({ where: { id: tradeId } });
  if (!trade || trade.draftId !== draftId) throw new Error("Trade request not found");
  if (trade.status !== "pending") throw new Error("Trade request is no longer pending");
  if (trade.proposingTeamId !== proposingTeamId) {
    throw new Error("Not authorized to cancel this trade");
  }

  return prisma.draftTradeRequest.update({
    where: { id: tradeId },
    data: { status: "cancelled", resolvedAt: new Date() },
  });
}

export function buildTradeEligibilityMap(
  state: DraftState,
  proposingTeamId: string | null,
  requestedPlayerId: string | null,
): Record<string, boolean> {
  if (!proposingTeamId || !requestedPlayerId) return {};
  const eligibleIds = getTradeEligibleOfferPlayerIds(
    state,
    proposingTeamId,
    requestedPlayerId,
  );
  return Object.fromEntries(eligibleIds.map((playerId) => [playerId, true]));
}

import {
  areQuotasEnabled,
  canTeamGiveRank,
  canTeamReceiveRank,
  type QuotaMode,
} from "@/lib/draft/quotas";

type TeamQuotaContext = {
  id: string;
  rankCounts: Record<number, number>;
  roster: Array<{
    playerId: string;
    firstName: string;
    lastName: string;
    rank: number;
    isStarter: boolean;
  }>;
};

type TradeValidationState = {
  draft: QuotaMode & { status: string };
  quotas: Record<number, { minPerTeam: number; maxPerTeam: number }>;
  teams: TeamQuotaContext[];
};

function findRosterPlayer(teams: TeamQuotaContext[], playerId: string) {
  for (const team of teams) {
    const player = team.roster.find((entry) => entry.playerId === playerId);
    if (player) return { team, player };
  }
  return null;
}

export function canExecuteTradeSwap(
  state: TradeValidationState,
  proposingTeamId: string,
  offeredPlayerId: string,
  requestedPlayerId: string,
): boolean {
  if (state.draft.status !== "complete") return false;
  if (!areQuotasEnabled(state.draft)) return true;

  const offered = findRosterPlayer(state.teams, offeredPlayerId);
  const requested = findRosterPlayer(state.teams, requestedPlayerId);
  if (!offered || !requested) return false;
  if (offered.player.isStarter || requested.player.isStarter) return false;
  if (offered.team.id !== proposingTeamId) return false;
  if (requested.team.id === proposingTeamId) return false;

  const proposingTeam = offered.team;
  const counterpartyTeam = requested.team;
  const offeredRank = offered.player.rank;
  const requestedRank = requested.player.rank;

  const proposingAfter = { ...proposingTeam.rankCounts };
  proposingAfter[offeredRank] = (proposingAfter[offeredRank] ?? 0) - 1;
  proposingAfter[requestedRank] = (proposingAfter[requestedRank] ?? 0) + 1;

  const counterpartyAfter = { ...counterpartyTeam.rankCounts };
  counterpartyAfter[requestedRank] = (counterpartyAfter[requestedRank] ?? 0) - 1;
  counterpartyAfter[offeredRank] = (counterpartyAfter[offeredRank] ?? 0) + 1;

  const affectedRanks = new Set([offeredRank, requestedRank]);

  for (const rank of affectedRanks) {
    const limit = state.quotas[rank];
    if (!limit) continue;

    if (state.draft.minQuotasEnabled) {
      if ((proposingAfter[rank] ?? 0) < limit.minPerTeam) return false;
      if ((counterpartyAfter[rank] ?? 0) < limit.minPerTeam) return false;
    }

    if (state.draft.maxQuotasEnabled) {
      if ((proposingAfter[rank] ?? 0) > limit.maxPerTeam) return false;
      if ((counterpartyAfter[rank] ?? 0) > limit.maxPerTeam) return false;
    }
  }

  return true;
}

export function getTradeEligibleOfferPlayerIds(
  state: TradeValidationState,
  proposingTeamId: string,
  requestedPlayerId: string,
): string[] {
  const proposingTeam = state.teams.find((team) => team.id === proposingTeamId);
  const requested = findRosterPlayer(state.teams, requestedPlayerId);
  if (!proposingTeam || !requested || requested.team.id === proposingTeamId) return [];

  return proposingTeam.roster
    .filter((player) => !player.isStarter)
    .filter((player) =>
      canExecuteTradeSwap(state, proposingTeamId, player.playerId, requestedPlayerId),
    )
    .map((player) => player.playerId);
}

/** Opponent roster players the captain can target with at least one valid offer. */
export function getTradeEligibleTargetPlayerIds(
  state: TradeValidationState,
  proposingTeamId: string,
): string[] {
  const proposingTeam = state.teams.find((team) => team.id === proposingTeamId);
  if (!proposingTeam) return [];

  const offerCandidates = proposingTeam.roster.filter((player) => !player.isStarter);
  if (offerCandidates.length === 0) return [];

  const eligibleTargetIds: string[] = [];

  for (const team of state.teams) {
    if (team.id === proposingTeamId) continue;

    for (const target of team.roster) {
      if (target.isStarter) continue;
      const canSwap = offerCandidates.some((offer) =>
        canExecuteTradeSwap(state, proposingTeamId, offer.playerId, target.playerId),
      );
      if (canSwap) eligibleTargetIds.push(target.playerId);
    }
  }

  return eligibleTargetIds;
}

export function isTradeRosterPlayerInactive(input: {
  tradeEnabled: boolean;
  quotasEnabled: boolean;
  isStarter: boolean;
  playerId: string;
  isCaptainTeam: boolean;
  hasOutgoingPending: boolean;
  tradeTargetPlayerId: string | null;
  offerEligibility: Record<string, boolean>;
  targetEligibility: Record<string, boolean>;
}): boolean {
  if (!input.tradeEnabled || !input.quotasEnabled || input.isStarter || input.hasOutgoingPending) {
    return false;
  }

  if (input.isCaptainTeam && input.tradeTargetPlayerId) {
    return input.offerEligibility[input.playerId] !== true;
  }

  if (!input.isCaptainTeam && !input.tradeTargetPlayerId) {
    return input.targetEligibility[input.playerId] !== true;
  }

  return false;
}

export type RosterMoveValidation = {
  allowed: boolean;
  violations: string[];
};

export function validateRosterMove(
  state: TradeValidationState,
  playerId: string,
  toTeamId: string,
): RosterMoveValidation {
  const located = findRosterPlayer(state.teams, playerId);
  if (!located) {
    return { allowed: false, violations: ["Player is not on a roster."] };
  }

  const fromTeamId = located.team.id;
  if (fromTeamId === toTeamId) {
    return { allowed: false, violations: ["Player is already on that team."] };
  }

  const toTeam = state.teams.find((team) => team.id === toTeamId);
  if (!toTeam) {
    return { allowed: false, violations: ["Destination team not found."] };
  }

  if (!areQuotasEnabled(state.draft)) {
    return { allowed: true, violations: [] };
  }

  const rank = located.player.rank;
  const violations: string[] = [];

  if (
    state.draft.minQuotasEnabled &&
    !canTeamGiveRank(
      located.team.rankCounts[rank] ?? 0,
      rank,
      state.quotas,
      true,
    )
  ) {
    violations.push("Source team would drop below the minimum rank quota.");
  }

  if (
    state.draft.maxQuotasEnabled &&
    !canTeamReceiveRank(
      toTeam.rankCounts[rank] ?? 0,
      rank,
      state.quotas,
      true,
    )
  ) {
    violations.push("Destination team would exceed the maximum rank quota.");
  }

  return { allowed: violations.length === 0, violations };
}

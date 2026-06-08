export type QuotaLimits = {
  minPerTeam: number;
  maxPerTeam: number;
};

export function computeRankQuotas(
  rankCounts: Record<number, number>,
  teamCount: number,
): Record<number, QuotaLimits> {
  const quotas: Record<number, QuotaLimits> = {};
  for (const [rankStr, count] of Object.entries(rankCounts)) {
    const rank = Number(rankStr);
    quotas[rank] = {
      minPerTeam: Math.floor(count / teamCount),
      maxPerTeam: Math.ceil(count / teamCount),
    };
  }
  return quotas;
}

export function countRanksInPool(ranks: number[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rank of ranks) {
    counts[rank] = (counts[rank] ?? 0) + 1;
  }
  return counts;
}

export function rankNeedForTeam(
  teamRankCount: number,
  rank: number,
  quotas: Record<number, QuotaLimits>,
): number {
  const limit = quotas[rank];
  if (!limit) return 0;
  return Math.max(0, limit.minPerTeam - teamRankCount);
}

export function totalRankNeedOtherTeams(
  teams: Array<{ id: string; rankCounts: Record<number, number> }>,
  pickingTeamId: string,
  rank: number,
  quotas: Record<number, QuotaLimits>,
): number {
  let total = 0;
  for (const team of teams) {
    if (team.id === pickingTeamId) continue;
    total += rankNeedForTeam(team.rankCounts[rank] ?? 0, rank, quotas);
  }
  return total;
}

export function canPickRank(
  pickingTeamId: string,
  rank: number,
  teamRankCount: number,
  teams: Array<{ id: string; rankCounts: Record<number, number> }>,
  undraftedRankCounts: Record<number, number>,
  quotas: Record<number, QuotaLimits>,
  quotasEnabled: boolean,
): boolean {
  if (!quotasEnabled) return true;
  const limit = quotas[rank];
  if (!limit) return true;
  if (teamRankCount >= limit.maxPerTeam) return false;

  const poolAfterPick = (undraftedRankCounts[rank] ?? 0) - 1;
  const needOtherTeams = totalRankNeedOtherTeams(teams, pickingTeamId, rank, quotas);
  return poolAfterPick >= needOtherTeams;
}

export function remainingQuotaSlots(
  teamRankCount: number,
  rank: number,
  quotas: Record<number, QuotaLimits>,
): number {
  const limit = quotas[rank];
  if (!limit) return 0;
  return Math.max(0, limit.maxPerTeam - teamRankCount);
}

/** How many more of a rank this team could draft given quota max and pool reserved for others' minimums. */
export function quotaCapForTeam(
  teamId: string,
  rank: number,
  teamRankCount: number,
  teams: Array<{ id: string; rankCounts: Record<number, number> }>,
  undraftedRankCounts: Record<number, number>,
  quotas: Record<number, QuotaLimits>,
): number {
  const slotCap = remainingQuotaSlots(teamRankCount, rank, quotas);
  if (slotCap === 0) return 0;
  const needOtherTeams = totalRankNeedOtherTeams(teams, teamId, rank, quotas);
  const poolCap = Math.max(0, (undraftedRankCounts[rank] ?? 0) - needOtherTeams);
  return Math.min(slotCap, poolCap);
}

/** Even-split roster targets; remainder goes to lowest pick-order teams first. */
export function computeTeamRosterTargets(poolSize: number, teamCount: number, pickOrders: number[]) {
  const base = Math.floor(poolSize / teamCount);
  const remainder = poolSize % teamCount;
  const sorted = [...pickOrders].sort((a, b) => a - b);
  const targets = new Map<number, number>();
  for (const order of sorted) {
    targets.set(order, base);
  }
  for (let i = 0; i < remainder; i++) {
    const order = sorted[i];
    targets.set(order, (targets.get(order) ?? base) + 1);
  }
  return targets;
}

export function computeRemainingPicks(
  targetRosterSize: number,
  currentRosterSize: number,
): number {
  return Math.max(0, targetRosterSize - currentRosterSize);
}

export type DraftTeamOrder = {
  id: string;
  pickOrder: number;
};

export function pickNumberToRound(pickNumber: number, teamCount: number): number {
  return Math.ceil(pickNumber / teamCount);
}

export function pickNumberToTeamIndex(pickNumber: number, teamCount: number): number {
  const round = pickNumberToRound(pickNumber, teamCount);
  const positionInRound = ((pickNumber - 1) % teamCount) + 1;
  if (round % 2 === 1) return positionInRound;
  return teamCount - positionInRound + 1;
}

export function getTeamForPick(
  pickNumber: number,
  teams: DraftTeamOrder[],
): DraftTeamOrder | null {
  if (teams.length === 0 || pickNumber < 1) return null;
  const sorted = [...teams].sort((a, b) => a.pickOrder - b.pickOrder);
  const index = pickNumberToTeamIndex(pickNumber, sorted.length) - 1;
  return sorted[index] ?? null;
}

export function buildTurnQueue(
  currentPickNumber: number,
  teams: DraftTeamOrder[],
  count: number,
  totalPicks?: number,
): Array<{ pickNumber: number; teamId: string; round: number }> {
  const queue = [];
  for (let i = 0; i < count; i++) {
    const pickNumber = currentPickNumber + i;
    if (totalPicks != null && pickNumber > totalPicks) break;
    const team = getTeamForPick(pickNumber, teams);
    if (!team) break;
    queue.push({
      pickNumber,
      teamId: team.id,
      round: pickNumberToRound(pickNumber, teams.length),
    });
  }
  return queue;
}

export function totalPicksForPool(poolSize: number): number {
  return poolSize;
}

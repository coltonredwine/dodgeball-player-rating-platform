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

export function sumRemainingPicks(remainingPicksByTeamId: Record<string, number>): number {
  return Object.values(remainingPicksByTeamId).reduce((sum, count) => sum + count, 0);
}

/** Upper bound for snake pick numbers; grows when the pool or skip headroom changes. */
export function computeMaxPickNumber(
  startPickNumber: number,
  teamCount: number,
  remainingPicksByTeamId: Record<string, number>,
  poolPickSlots: number,
): number {
  const picksRemaining = sumRemainingPicks(remainingPicksByTeamId);
  if (picksRemaining <= 0) {
    return Math.max(poolPickSlots, startPickNumber - 1);
  }

  const skipHeadroom = Math.max(0, teamCount - 1) * picksRemaining;
  return Math.max(poolPickSlots, startPickNumber + picksRemaining + skipHeadroom - 1);
}

export function findNextActivePickSlot(
  startPickNumber: number,
  teams: DraftTeamOrder[],
  remainingPicksByTeamId: Record<string, number>,
  maxPickNumber: number,
  canPickByTeamId?: Record<string, boolean>,
  usedPickNumbers?: Set<number>,
): { pickNumber: number; teamId: string } | null {
  for (let pickNumber = Math.max(1, startPickNumber); pickNumber <= maxPickNumber; pickNumber++) {
    if (usedPickNumbers?.has(pickNumber)) continue;
    const team = getTeamForPick(pickNumber, teams);
    if (!team) continue;
    if ((remainingPicksByTeamId[team.id] ?? 0) <= 0) continue;
    if (canPickByTeamId && canPickByTeamId[team.id] === false) continue;
    return { pickNumber, teamId: team.id };
  }
  return null;
}

export function buildTurnQueue(
  activePickNumber: number,
  teams: DraftTeamOrder[],
  count: number,
  maxPickNumber?: number,
  remainingPicksByTeamId?: Record<string, number>,
  canPickByTeamId?: Record<string, boolean>,
  usedPickNumbers?: Set<number>,
): Array<{ pickNumber: number; teamId: string; round: number }> {
  const queue = [];
  let cursor = activePickNumber;
  const used = new Set(usedPickNumbers ?? []);

  while (queue.length < count) {
    if (maxPickNumber != null && cursor > maxPickNumber) break;
    if (remainingPicksByTeamId) {
      const slot = findNextActivePickSlot(
        cursor,
        teams,
        remainingPicksByTeamId,
        maxPickNumber ?? cursor,
        canPickByTeamId,
        used,
      );
      if (!slot) break;
      queue.push({
        pickNumber: slot.pickNumber,
        teamId: slot.teamId,
        round: pickNumberToRound(slot.pickNumber, teams.length),
      });
      used.add(slot.pickNumber);
      cursor = slot.pickNumber + 1;
      continue;
    }

    if (used.has(cursor)) {
      cursor += 1;
      continue;
    }
    const team = getTeamForPick(cursor, teams);
    if (!team) break;
    queue.push({
      pickNumber: cursor,
      teamId: team.id,
      round: pickNumberToRound(cursor, teams.length),
    });
    used.add(cursor);
    cursor += 1;
  }

  return queue;
}

export function totalPicksForPool(poolSize: number): number {
  return poolSize;
}

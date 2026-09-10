export const PICK_ORDER_MODES = ["snake", "lowest_avg"] as const;
export type DraftPickOrderMode = (typeof PICK_ORDER_MODES)[number];

export function parsePickOrderMode(raw: string | null | undefined): DraftPickOrderMode {
  if (raw === "lowest_avg") return "lowest_avg";
  return "snake";
}

export function rosterAverageOverall(
  roster: Array<{ overall: number }>,
): number | null {
  if (roster.length === 0) return null;
  const sum = roster.reduce((total, entry) => total + entry.overall, 0);
  return sum / roster.length;
}

export type TeamPickEligibility = {
  id: string;
  pickOrder: number;
  remainingPicks: number;
  rosterAverage: number | null;
};

/** Next unused pick number at or above `startPickNumber`. */
export function nextUnusedPickNumber(startPickNumber: number, usedPickNumbers?: Set<number>): number {
  let pickNumber = Math.max(1, startPickNumber);
  if (!usedPickNumbers) return pickNumber;
  while (usedPickNumbers.has(pickNumber)) {
    pickNumber += 1;
  }
  return pickNumber;
}

/**
 * Admin off-clock assigns use a pick number above the current clock slot so they
 * do not consume the on-clock team's upcoming snake/lowest-avg pick number.
 */
export function allocateOffClockPickNumber(
  nextPickNumber: number,
  usedPickNumbers: Set<number>,
): number {
  let pickNumber = Math.max(nextPickNumber + 1, 1);
  for (const used of usedPickNumbers) {
    pickNumber = Math.max(pickNumber, used + 1);
  }
  while (usedPickNumbers.has(pickNumber)) {
    pickNumber += 1;
  }
  return pickNumber;
}

/**
 * Team with the lowest roster average picks next.
 * Empty rosters count as lowest. Ties break by pickOrder ascending.
 */
export function findNextLowestAverageSlot(
  startPickNumber: number,
  teams: TeamPickEligibility[],
  canPickByTeamId?: Record<string, boolean>,
  usedPickNumbers?: Set<number>,
): { pickNumber: number; teamId: string } | null {
  const eligible = teams.filter((team) => {
    if (team.remainingPicks <= 0) return false;
    if (canPickByTeamId && canPickByTeamId[team.id] === false) return false;
    return true;
  });
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const avgA = a.rosterAverage ?? Number.NEGATIVE_INFINITY;
    const avgB = b.rosterAverage ?? Number.NEGATIVE_INFINITY;
    if (avgA !== avgB) return avgA - avgB;
    return a.pickOrder - b.pickOrder;
  });

  return {
    pickNumber: nextUnusedPickNumber(startPickNumber, usedPickNumbers),
    teamId: eligible[0]!.id,
  };
}

export function buildLowestAverageTurnQueue(
  startPickNumber: number,
  teams: TeamPickEligibility[],
  count: number,
  canPickByTeamId?: Record<string, boolean>,
  usedPickNumbers?: Set<number>,
): Array<{ pickNumber: number; teamId: string; round: number }> {
  const remaining = new Map(teams.map((team) => [team.id, team.remainingPicks]));
  const used = new Set(usedPickNumbers ?? []);
  const queue: Array<{ pickNumber: number; teamId: string; round: number }> = [];
  let cursor = Math.max(1, startPickNumber);

  while (queue.length < count) {
    const snapshot: TeamPickEligibility[] = teams.map((team) => ({
      ...team,
      remainingPicks: remaining.get(team.id) ?? 0,
    }));
    const slot = findNextLowestAverageSlot(cursor, snapshot, canPickByTeamId, used);
    if (!slot) break;
    queue.push({
      pickNumber: slot.pickNumber,
      teamId: slot.teamId,
      round: Math.ceil(slot.pickNumber / Math.max(teams.length, 1)),
    });
    used.add(slot.pickNumber);
    remaining.set(slot.teamId, (remaining.get(slot.teamId) ?? 0) - 1);
    cursor = slot.pickNumber + 1;
  }

  return queue;
}

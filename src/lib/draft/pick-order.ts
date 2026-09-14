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

export type TurnQueueSlot = {
  pickNumber: number;
  teamId: string;
  round: number;
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
 * Partition chronological picks into rounds where each team appears at most once
 * per round. Returns team ids that have already picked in the open (latest) round.
 */
export function getTeamsPickedInOpenRound(
  picksChronological: Array<{ teamId: string }>,
): Set<string> {
  const picked = new Set<string>();
  for (const pick of picksChronological) {
    if (picked.has(pick.teamId)) {
      picked.clear();
    }
    picked.add(pick.teamId);
  }
  return picked;
}

function compareLowestAverage(a: TeamPickEligibility, b: TeamPickEligibility): number {
  const avgA = a.rosterAverage ?? Number.NEGATIVE_INFINITY;
  const avgB = b.rosterAverage ?? Number.NEGATIVE_INFINITY;
  if (avgA !== avgB) return avgA - avgB;
  return a.pickOrder - b.pickOrder;
}

function filterEligible(
  teams: TeamPickEligibility[],
  canPickByTeamId?: Record<string, boolean>,
): TeamPickEligibility[] {
  return teams.filter((team) => {
    if (team.remainingPicks <= 0) return false;
    if (canPickByTeamId && canPickByTeamId[team.id] === false) return false;
    return true;
  });
}

/**
 * Teams still due to pick in the current lowest-avg round, lowest average first.
 * When everyone eligible has already picked this round, starts a fresh round.
 */
export function getCurrentRoundTeams(
  teams: TeamPickEligibility[],
  pickedThisRound: Set<string>,
  canPickByTeamId?: Record<string, boolean>,
): { teams: TeamPickEligibility[]; isFreshRound: boolean } {
  const eligible = filterEligible(teams, canPickByTeamId);
  if (pickedThisRound.size === 0) {
    return { teams: [...eligible].sort(compareLowestAverage), isFreshRound: true };
  }
  const remaining = eligible.filter((team) => !pickedThisRound.has(team.id));
  if (remaining.length === 0) {
    return { teams: [...eligible].sort(compareLowestAverage), isFreshRound: true };
  }
  return { teams: [...remaining].sort(compareLowestAverage), isFreshRound: false };
}

/** Teams that already picked this round, ordered by current roster average (next round preview). */
export function getNextRoundPreviewTeams(
  teams: TeamPickEligibility[],
  pickedThisRound: Set<string>,
  isFreshRound: boolean,
  canPickByTeamId?: Record<string, boolean>,
): TeamPickEligibility[] {
  if (isFreshRound) return [];
  return filterEligible(teams, canPickByTeamId)
    .filter((team) => pickedThisRound.has(team.id))
    .sort(compareLowestAverage);
}

/**
 * Team with the lowest roster average among those still due this round.
 * Empty rosters count as lowest. Ties break by pickOrder ascending.
 */
export function findNextLowestAverageSlot(
  startPickNumber: number,
  teams: TeamPickEligibility[],
  canPickByTeamId?: Record<string, boolean>,
  usedPickNumbers?: Set<number>,
  pickedThisRound: Set<string> = new Set(),
): { pickNumber: number; teamId: string } | null {
  const { teams: due } = getCurrentRoundTeams(teams, pickedThisRound, canPickByTeamId);
  if (due.length === 0) return null;

  return {
    pickNumber: nextUnusedPickNumber(startPickNumber, usedPickNumbers),
    teamId: due[0]!.id,
  };
}

/** One entry per captain still due this round (does not repeat the same captain). */
export function buildLowestAverageTurnQueue(
  startPickNumber: number,
  teams: TeamPickEligibility[],
  count: number,
  canPickByTeamId?: Record<string, boolean>,
  usedPickNumbers?: Set<number>,
  pickedThisRound: Set<string> = new Set(),
): TurnQueueSlot[] {
  const { teams: due } = getCurrentRoundTeams(teams, pickedThisRound, canPickByTeamId);
  const used = new Set(usedPickNumbers ?? []);
  const queue: TurnQueueSlot[] = [];
  let cursor = Math.max(1, startPickNumber);
  const roundNumber = Math.max(1, Math.ceil(cursor / Math.max(teams.length, 1)));

  for (const team of due) {
    if (queue.length >= count) break;
    const pickNumber = nextUnusedPickNumber(cursor, used);
    queue.push({
      pickNumber,
      teamId: team.id,
      round: roundNumber,
    });
    used.add(pickNumber);
    cursor = pickNumber + 1;
  }

  return queue;
}

export function buildLowestAverageNextRoundQueue(
  teams: TeamPickEligibility[],
  pickedThisRound: Set<string>,
  canPickByTeamId?: Record<string, boolean>,
): Array<{ teamId: string }> {
  const { isFreshRound } = getCurrentRoundTeams(teams, pickedThisRound, canPickByTeamId);
  return getNextRoundPreviewTeams(teams, pickedThisRound, isFreshRound, canPickByTeamId).map(
    (team) => ({ teamId: team.id }),
  );
}

/** Matches `RANKS_DESC` in rank-labels (highest rank first). */
const POOL_SECTION_RANKS = [5, 4, 3, 2, 1] as const;

export type PoolPlayerSection<T> =
  | { kind: "saved"; players: T[] }
  | { kind: "rank"; rank: number; players: T[] };

type PoolPlayer = {
  playerId: string;
  scores: { rank: number } | null;
};

/** Group pool players into saved + rank sections, preserving order within each group. */
export function groupPoolPlayersIntoSections<T extends PoolPlayer>(
  players: T[],
  options?: { bookmarkIds?: string[] },
): PoolPlayerSection<T>[] {
  const bookmarkIds = options?.bookmarkIds ?? [];
  const bookmarkSet = new Set(bookmarkIds);
  const playersById = new Map(players.map((player) => [player.playerId, player]));
  const saved = bookmarkIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is T => player != null);
  const rankBuckets = new Map<number, T[]>(
    POOL_SECTION_RANKS.map((rank) => [rank, []]),
  );
  const unranked: T[] = [];

  for (const player of players) {
    if (bookmarkSet.has(player.playerId)) continue;

    const rank = player.scores?.rank;
    if (rank != null && rankBuckets.has(rank)) {
      rankBuckets.get(rank)!.push(player);
      continue;
    }

    unranked.push(player);
  }

  const sections: PoolPlayerSection<T>[] = [];
  if (saved.length > 0) sections.push({ kind: "saved", players: saved });

  for (const rank of POOL_SECTION_RANKS) {
    const group = rankBuckets.get(rank)!;
    if (group.length > 0) sections.push({ kind: "rank", rank, players: group });
  }

  if (unranked.length > 0) sections.push({ kind: "rank", rank: 0, players: unranked });

  return sections;
}

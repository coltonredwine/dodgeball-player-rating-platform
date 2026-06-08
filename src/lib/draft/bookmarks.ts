/** Undrafted players bookmarked by the captain first, in bookmark order, then the rest. */
export function sortUndraftedWithBookmarks<T extends { playerId: string }>(
  players: T[],
  flaggedPlayerIds: string[],
): T[] {
  if (flaggedPlayerIds.length === 0) return players;

  const flagOrder = new Map(flaggedPlayerIds.map((id, index) => [id, index]));
  const flagged: T[] = [];
  const rest: T[] = [];

  for (const player of players) {
    if (flagOrder.has(player.playerId)) flagged.push(player);
    else rest.push(player);
  }

  flagged.sort(
    (a, b) => (flagOrder.get(a.playerId) ?? 0) - (flagOrder.get(b.playerId) ?? 0),
  );

  return [...flagged, ...rest];
}

/** Bookmarked players not yet on the roster and still available in the pool. */
export function resolveGhostRosterPlayers<T extends { playerId: string }>(
  flaggedPlayerIds: string[],
  rosterPlayerIds: Iterable<string>,
  undrafted: T[],
): T[] {
  if (flaggedPlayerIds.length === 0) return [];

  const onRoster = new Set(rosterPlayerIds);
  const undraftedById = new Map(undrafted.map((player) => [player.playerId, player]));

  return flaggedPlayerIds
    .filter((playerId) => !onRoster.has(playerId))
    .map((playerId) => undraftedById.get(playerId))
    .filter((player): player is T => player != null);
}

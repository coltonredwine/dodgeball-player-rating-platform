export type SearchablePlayer = {
  firstName: string;
  lastName: string;
};

export function filterPlayersByQuery<T extends SearchablePlayer>(
  players: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return players;

  return players.filter((player) => {
    const first = player.firstName.toLowerCase();
    const last = player.lastName.toLowerCase();
    const full = `${first} ${last}`;
    const reversed = `${last} ${first}`;
    const formal = `${last}, ${first}`;

    return (
      first.includes(normalized) ||
      last.includes(normalized) ||
      full.includes(normalized) ||
      reversed.includes(normalized) ||
      formal.includes(normalized)
    );
  });
}

export function playerMatchesQuery(player: SearchablePlayer, query: string): boolean {
  return filterPlayersByQuery([player], query).length > 0;
}

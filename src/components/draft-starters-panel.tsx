"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayerSearchInput } from "@/components/player-search-input";
import { ScrollableListCard } from "@/components/scrollable-list-card";
import { filterPlayersByQuery } from "@/lib/player-search";

type Team = {
  id: string;
  captainName: string;
  color: string;
  roster: Array<{
    playerId: string;
    firstName: string;
    lastName: string;
    isStarter: boolean;
  }>;
};

type PoolPlayer = { playerId: string; firstName: string; lastName: string };

type Props = {
  draftId: string;
  onChanged?: () => void;
};

export function DraftStartersSection({ draftId, onChanged }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [poolPlayers, setPoolPlayers] = useState<PoolPlayer[]>([]);
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/draft/${draftId}/state`);
    if (!res.ok) return;
    const data = await res.json();

    setTeams(
      data.teams.map((t: Team) => ({
        id: t.id,
        captainName: t.captainName,
        color: t.color,
        roster: t.roster,
      })),
    );

    const starterIds = new Set<string>();
    for (const team of data.teams as Team[]) {
      for (const entry of team.roster) {
        if (entry.isStarter) starterIds.add(entry.playerId);
      }
    }

    const undrafted = (data.undrafted as PoolPlayer[]).map((p) => ({
      playerId: p.playerId,
      firstName: p.firstName,
      lastName: p.lastName,
    }));
    const starters = (data.teams as Team[]).flatMap((team) =>
      team.roster
        .filter((entry) => entry.isStarter)
        .map((entry) => ({
          playerId: entry.playerId,
          firstName: entry.firstName,
          lastName: entry.lastName,
        })),
    );
    const byId = new Map<string, PoolPlayer>();
    for (const player of [...undrafted, ...starters]) {
      byId.set(player.playerId, player);
    }
    setPoolPlayers(
      [...byId.values()].sort((a, b) => a.lastName.localeCompare(b.lastName)),
    );
  }, [draftId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredPoolPlayers = useMemo(
    () => filterPlayersByQuery(poolPlayers, playerSearch),
    [poolPlayers, playerSearch],
  );

  const selectedPlayer = poolPlayers.find((player) => player.playerId === playerId);

  async function addStarter() {
    if (!teamId || !playerId) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/drafts/${draftId}/starters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, playerId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(typeof data.error === "string" ? data.error : "Could not add starter");
      return;
    }
    setMessage("Starting player added");
    setPlayerId("");
    await refresh();
    onChanged?.();
  }

  async function removeStarter(targetPlayerId: string) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(
      `/api/admin/drafts/${draftId}/starters?playerId=${encodeURIComponent(targetPlayerId)}`,
      { method: "DELETE" },
    );
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not remove starter");
      return;
    }
    setMessage("Starting player removed");
    await refresh();
    onChanged?.();
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-zinc-500">
        Pre-assign players to teams without using a pick. Counts toward roster size and rank quotas.
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded border px-2 py-1 text-sm"
          value={teamId}
          disabled={busy}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">Team…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.captainName}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !teamId || !playerId}
          className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50"
          onClick={addStarter}
        >
          Add starter
        </button>
      </div>
      {selectedPlayer ? (
        <p className="text-sm text-zinc-600">
          Selected player: {selectedPlayer.lastName}, {selectedPlayer.firstName}
        </p>
      ) : null}
      <PlayerSearchInput value={playerSearch} onChange={setPlayerSearch} />
      <ScrollableListCard maxHeightClass="max-h-48">
        <ul className="divide-y divide-zinc-100">
          {filteredPoolPlayers.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-zinc-500">No matching players.</li>
          ) : (
            filteredPoolPlayers.map((player) => (
              <li key={player.playerId}>
                <button
                  type="button"
                  disabled={busy}
                  className={[
                    "w-full px-3 py-2 text-left text-sm hover:bg-zinc-50",
                    playerId === player.playerId ? "bg-blue-50 font-medium" : "",
                  ].join(" ")}
                  onClick={() => setPlayerId(player.playerId)}
                >
                  {player.lastName}, {player.firstName}
                </button>
              </li>
            ))
          )}
        </ul>
      </ScrollableListCard>
      {message ? <p className="text-sm text-blue-700">{message}</p> : null}
      <ul className="space-y-2 text-sm">
        {teams.map((team) => {
          const starters = team.roster.filter((entry) => entry.isStarter);
          return (
            <li key={team.id} className="rounded border border-zinc-100 px-3 py-2">
              <span className="font-medium" style={{ color: team.color }}>
                {team.captainName}
              </span>
              {starters.length === 0 ? (
                <span className="ml-2 text-zinc-500">No starters</span>
              ) : (
                <ul className="mt-1 space-y-1">
                  {starters.map((starter) => (
                    <li key={starter.playerId} className="flex items-center justify-between gap-2">
                      <span>
                        {starter.lastName}, {starter.firstName}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs text-red-700 underline disabled:opacity-50"
                        onClick={() => removeStarter(starter.playerId)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

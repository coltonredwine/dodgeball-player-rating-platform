"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayerSearchInput } from "@/components/player-search-input";
import { ScrollableListCard } from "@/components/scrollable-list-card";
import { filterPlayersByQuery } from "@/lib/player-search";

type PoolPlayerRow = {
  id: string;
  firstName: string;
  lastName: string;
  active: boolean;
  inPool: boolean;
  drafted: boolean;
  isStarter: boolean;
  canAdd: boolean;
  canRemove: boolean;
};

type Props = {
  draftId: string;
  onChanged?: () => void;
};

export function DraftPoolSection({ draftId, onChanged }: Props) {
  const [players, setPlayers] = useState<PoolPlayerRow[]>([]);
  const [poolCount, setPoolCount] = useState(0);
  const [draftStatus, setDraftStatus] = useState("setup");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in-pool" | "available">("all");
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/drafts/${draftId}/players`);
    if (!res.ok) return;
    const data = await res.json();
    setPlayers(data.players ?? []);
    setPoolCount(data.poolCount ?? 0);
    setDraftStatus(data.draftStatus ?? "setup");
  }, [draftId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredPlayers = useMemo(() => {
    let rows = players;
    if (filter === "in-pool") rows = rows.filter((player) => player.inPool);
    if (filter === "available") rows = rows.filter((player) => !player.inPool);
    return filterPlayersByQuery(rows, search);
  }, [filter, players, search]);

  async function addPlayer(playerId: string) {
    setBusyId(playerId);
    setMessage(null);
    const res = await fetch(`/api/admin/drafts/${draftId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not add player");
      return;
    }
    await refresh();
    onChanged?.();
  }

  async function removePlayer(playerId: string) {
    setBusyId(playerId);
    setMessage(null);
    const res = await fetch(`/api/admin/drafts/${draftId}/players?playerId=${encodeURIComponent(playerId)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not remove player");
      return;
    }
    await refresh();
    onChanged?.();
  }

  const poolLocked = draftStatus === "complete";

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600">
        {poolCount} player{poolCount === 1 ? "" : "s"} in this draft. Add or remove players from the
        global player database.
        {poolLocked ? " Completed drafts cannot be changed." : null}
      </p>
      {message ? <p className="text-sm text-red-700">{message}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          Show
          <select
            className="rounded border px-2 py-1"
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
          >
            <option value="all">All players</option>
            <option value="in-pool">In draft pool</option>
            <option value="available">Available to add</option>
          </select>
        </label>
      </div>
      <ScrollableListCard maxHeightClass="max-h-[40vh]">
        <div className="border-b border-zinc-200 px-3 py-2">
          <PlayerSearchInput value={search} onChange={setSearch} placeholder="Search players…" />
        </div>
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Player</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-zinc-500">
                  No matching players.
                </td>
              </tr>
            ) : (
              filteredPlayers.map((player) => (
                <tr key={player.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">
                    {player.lastName}, {player.firstName}
                    {!player.active ? (
                      <span className="ml-2 text-xs text-zinc-400">(inactive)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-600">
                    {player.inPool ? (
                      <span className="inline-flex flex-wrap gap-1">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5">In pool</span>
                        {player.drafted ? (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-900">Drafted</span>
                        ) : null}
                        {player.isStarter ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">Starter</span>
                        ) : null}
                      </span>
                    ) : (
                      "Not in pool"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {player.canAdd ? (
                      <button
                        type="button"
                        disabled={busyId === player.id}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
                        onClick={() => void addPlayer(player.id)}
                      >
                        Add
                      </button>
                    ) : player.canRemove ? (
                      <button
                        type="button"
                        disabled={busyId === player.id}
                        className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                        onClick={() => void removePlayer(player.id)}
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollableListCard>
    </div>
  );
}

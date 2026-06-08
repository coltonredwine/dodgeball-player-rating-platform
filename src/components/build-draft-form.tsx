"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ScrollableListCard } from "@/components/scrollable-list-card";

type Player = { id: string; firstName: string; lastName: string; active: boolean };
type Rater = { id: string; name: string; active: boolean };

type Props = {
  players: Player[];
  raters: Rater[];
};

export function BuildDraftForm({ players, raters }: Props) {
  const router = useRouter();
  const activePlayers = useMemo(() => players.filter((p) => p.active), [players]);
  const activeRaters = useMemo(() => raters.filter((r) => r.active), [raters]);

  const [name, setName] = useState("");
  const [teamCount, setTeamCount] = useState(4);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(
    () => new Set(activePlayers.map((p) => p.id)),
  );
  const [captains, setCaptains] = useState<string[]>(() =>
    activeRaters.slice(0, 4).map((r) => r.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function togglePlayer(id: string) {
    setSelectedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setCaptainAt(index: number, raterId: string) {
    setCaptains((prev) => {
      const next = [...prev];
      while (next.length < teamCount) next.push("");
      next[index] = raterId;
      return next.slice(0, teamCount);
    });
  }

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Draft name is required");
      return;
    }
    if (selectedPlayers.size === 0) {
      setError("Select at least one player");
      return;
    }
    if (captains.filter(Boolean).length !== teamCount) {
      setError("Assign a captain for each team");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          teamCount,
          playerIds: [...selectedPlayers],
          captains: captains.map((raterId, index) => ({
            raterId,
            pickOrder: index + 1,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create draft");
      router.push(`/backend/drafts/${data.draft.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create draft");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <label className="block text-sm font-medium">Draft name</label>
        <input
          className="w-full max-w-md rounded border border-zinc-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spring 2026 Draft"
        />
      </section>

      <section className="space-y-2">
        <label className="block text-sm font-medium">Number of teams</label>
        <input
          type="number"
          min={2}
          max={12}
          className="w-24 rounded border border-zinc-300 px-3 py-2"
          value={teamCount}
          onChange={(e) => {
            const n = Number(e.target.value);
            setTeamCount(n);
            setCaptains((prev) => {
              const next = [...prev];
              while (next.length < n) next.push("");
              return next.slice(0, n);
            });
          }}
        />
      </section>

      <section className="space-y-2">
        <ScrollableListCard
          title="Player pool"
          maxHeightClass="max-h-64"
          headerAction={
            <button
              type="button"
              className="text-sm text-blue-700 underline"
              onClick={() => setSelectedPlayers(new Set(activePlayers.map((p) => p.id)))}
            >
              Select all active
            </button>
          }
        >
          {activePlayers.map((p) => (
            <label key={p.id} className="flex items-center gap-2 px-3 py-1 text-sm">
              <input
                type="checkbox"
                checked={selectedPlayers.has(p.id)}
                onChange={() => togglePlayer(p.id)}
              />
              {p.lastName}, {p.firstName}
            </label>
          ))}
        </ScrollableListCard>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Captains & pick order</h2>
        {Array.from({ length: teamCount }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-16 text-sm text-zinc-600">Pick {i + 1}</span>
            <select
              className="rounded border border-zinc-300 px-2 py-1 text-sm"
              value={captains[i] ?? ""}
              onChange={(e) => setCaptainAt(i, e.target.value)}
            >
              <option value="">Select captain…</option>
              {activeRaters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={submitting}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        onClick={submit}
      >
        {submitting ? "Creating…" : "Create draft"}
      </button>
    </div>
  );
}

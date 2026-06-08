"use client";

import { useEffect, useMemo, useState } from "react";
import { METRIC_FIELDS, type MetricField } from "@/lib/constants";
import { RankGlyph } from "@/components/rank-glyph";
import { ScrollableListCard } from "@/components/scrollable-list-card";
import { filterPlayersByQuery } from "@/lib/player-search";

function formatRaterScore(value: number | null): string {
  return value == null ? "—" : String(value);
}

type PlayerScore = {
  playerId: string;
  firstName: string;
  lastName: string;
  scores: {
    rank: number;
    overall: number;
    displayOffensive: number;
    displayDefensive: number;
    displayPsych: number;
    leaning: string;
    metrics: Record<string, number>;
  };
};

type PlayerDetail = {
  raterScores: Array<{
    raterId: string;
    raterName: string;
    excluded: boolean;
    power: number | null;
    accuracy: number | null;
    intimidation: number | null;
    catching: number | null;
    evasion: number | null;
    nerve: number | null;
  }>;
  averages: Record<MetricField, number>;
  overrides: Partial<Record<MetricField, number>>;
  scores: PlayerScore["scores"];
};

export function DraftScoresPanel({ draftId }: { draftId: string }) {
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [detail, setDetail] = useState<PlayerDetail | null>(null);

  useEffect(() => {
    fetch(`/api/admin/drafts/${draftId}/scores`)
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []));
  }, [draftId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetch(`/api/admin/drafts/${draftId}/scores/${selectedId}`)
      .then((r) => r.json())
      .then(setDetail);
  }, [draftId, selectedId]);

  async function refreshSelected() {
    if (!selectedId) return;
    const refreshed = await fetch(`/api/admin/drafts/${draftId}/scores/${selectedId}`).then((r) =>
      r.json(),
    );
    setDetail(refreshed);
    const list = await fetch(`/api/admin/drafts/${draftId}/scores`).then((r) => r.json());
    setPlayers(list.players ?? []);
  }

  async function toggleExclusion(raterId: string, excluded: boolean) {
    if (!selectedId) return;
    await fetch(`/api/admin/drafts/${draftId}/scores`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: selectedId, raterId, excluded }),
    });
    await refreshSelected();
  }

  async function setOverride(metric: MetricField, value: number | null) {
    if (!selectedId) return;
    await fetch(`/api/admin/drafts/${draftId}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: selectedId, metric, value }),
    });
    await refreshSelected();
  }

  const selected = players.find((p) => p.playerId === selectedId);
  const filteredPlayers = useMemo(
    () => filterPlayersByQuery(players, playerSearch),
    [players, playerSearch],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ScrollableListCard
        title="Players"
        description="Select a player to review scores."
        searchQuery={playerSearch}
        onSearchQueryChange={setPlayerSearch}
      >
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50 text-left">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">CALC</th>
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
              filteredPlayers.map((p) => (
                <tr
                  key={p.playerId}
                  className={selectedId === p.playerId ? "bg-blue-50" : "cursor-pointer hover:bg-zinc-50"}
                  onClick={() => setSelectedId(p.playerId)}
                >
                  <td className="px-3 py-2">
                    {p.lastName}, {p.firstName}
                  </td>
                  <td className="px-3 py-2">
                    <RankGlyph rank={p.scores.rank} size={20} />
                  </td>
                  <td className="px-3 py-2">{p.scores.overall.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollableListCard>

      <div className="rounded border border-zinc-200 p-4">
        {!selected || !detail ? (
          <p className="text-sm text-zinc-500">Select a player to review rater scores and overrides.</p>
        ) : (
          <div className="space-y-4">
            <h3 className="font-medium">
              {selected.firstName} {selected.lastName}
            </h3>

            <div className="rounded border border-zinc-100 bg-zinc-50 p-3 text-sm">
              <p className="font-medium">Average metrics</p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {METRIC_FIELDS.map((field) => (
                  <div key={field}>
                    <p className="text-xs capitalize text-zinc-500">{field}</p>
                    <p className="tabular-nums">{detail.scores.metrics[field].toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-zinc-600">
                <RankGlyph rank={detail.scores.rank} size={20} />
                <span>
                  · CALC {detail.scores.overall.toFixed(2)} · OFF{" "}
                  {detail.scores.displayOffensive.toFixed(2)} · DEF{" "}
                  {detail.scores.displayDefensive.toFixed(2)} · PSY{" "}
                  {detail.scores.displayPsych.toFixed(2)}
                </span>
              </p>
            </div>

            <div className="overflow-x-auto">
              <ScrollableListCard maxHeightClass="max-h-[40vh]">
                <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="sticky left-0 z-10 bg-white py-1 pr-3">Rater</th>
                    <th className="px-2 py-1 text-center">Exclude</th>
                    {METRIC_FIELDS.map((field) => (
                      <th key={field} className="px-2 py-1 text-center font-normal capitalize">
                        {field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.raterScores.map((r) => (
                    <tr key={r.raterId} className="border-t border-zinc-100">
                      <td className="sticky left-0 z-10 bg-white py-2 pr-3">{r.raterName}</td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={r.excluded}
                          onChange={(e) => toggleExclusion(r.raterId, e.target.checked)}
                        />
                      </td>
                      {METRIC_FIELDS.map((field) => (
                        <td key={field} className="px-2 py-2 text-center tabular-nums">
                          {formatRaterScore(r[field])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              </ScrollableListCard>
            </div>

            <div>
              <h4 className="text-sm font-medium">Metric overrides</h4>
              <div className="mt-2 space-y-2">
                {METRIC_FIELDS.map((metric) => {
                  const overridden = detail.overrides[metric] != null;
                  const baseAverage = detail.averages[metric];
                  return (
                    <div key={metric} className="flex flex-wrap items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={overridden}
                        onChange={(e) => {
                          if (e.target.checked) setOverride(metric, baseAverage);
                          else setOverride(metric, null);
                        }}
                        aria-label={`Override ${metric}`}
                      />
                      <span className="w-24 capitalize">{metric}</span>
                      <input
                        type="number"
                        step="0.01"
                        min={1}
                        max={7}
                        disabled={!overridden}
                        className="w-20 rounded border px-2 py-1 disabled:bg-zinc-100 disabled:text-zinc-500"
                        value={overridden ? detail.overrides[metric] : baseAverage}
                        onChange={(e) => setOverride(metric, Number(e.target.value))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { DraftCaptainsSection } from "@/components/draft-captains-panel";
import { DraftPoolSection } from "@/components/draft-pool-panel";
import { DraftStartersSection } from "@/components/draft-starters-panel";
import { RankGlyph } from "@/components/rank-glyph";
import { ScrollableListCard } from "@/components/scrollable-list-card";
import { filterPlayersByQuery } from "@/lib/player-search";
import {
  DEFAULT_SORT_SETTINGS,
  PLAYER_SORT_OPTIONS,
  sortDraftPlayers,
  type PlayerSortField,
} from "@/lib/draft/sort";
import { assignRank } from "@/lib/rankings/thresholds";
import { formatRank } from "@/lib/rankings/rank-labels";
import type { DraftRosterSortMode, SortDirection } from "@/lib/draft/roster-sort";
import type { RosterAverageMetric } from "@/lib/draft/roster-average";
import { leaguePath } from "@/lib/league-path";

type RankThresholds = { "2": number; "3": number; "4": number; "5": number };

type PlayerRow = {
  playerId: string;
  firstName: string;
  lastName: string;
  scores: {
    overall: number;
    rank: number;
  };
};

type Props = {
  draftId: string;
  onSaved?: () => void;
};

export function DraftSettingsPanel({ draftId, onSaved }: Props) {
  const pathname = usePathname();
  const leagueSlug = pathname?.split("/").filter(Boolean)[0] ?? "";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<RankThresholds>({
    "2": 0.605,
    "3": 0.69,
    "4": 0.805,
    "5": 1.0,
  });
  const [minQuotasEnabled, setMinQuotasEnabled] = useState(true);
  const [maxQuotasEnabled, setMaxQuotasEnabled] = useState(true);
  const [pickOrderMode, setPickOrderMode] = useState<"snake" | "lowest_avg">("snake");
  const [showRanksOnCaptainView, setShowRanksOnCaptainView] = useState(true);
  const [hideRanksOnCompleteTeams, setHideRanksOnCompleteTeams] = useState(false);
  const [playerRanksEnabled, setPlayerRanksEnabled] = useState(true);
  const [rallyModifier, setRallyModifier] = useState("");
  const [publicBoardEnabled, setPublicBoardEnabled] = useState(false);
  const [publicShowRanks, setPublicShowRanks] = useState(true);
  const [publicShowSkillRatings, setPublicShowSkillRatings] = useState(true);
  const [publicRosterSort, setPublicRosterSort] = useState<DraftRosterSortMode>("pickOrder");
  const [publicRosterSortDirection, setPublicRosterSortDirection] =
    useState<SortDirection>("desc");
  const [rosterAverageMetric, setRosterAverageMetric] =
    useState<RosterAverageMetric>("rank");
  const [primarySort, setPrimarySort] = useState<PlayerSortField>(DEFAULT_SORT_SETTINGS.primarySort);
  const [secondarySort, setSecondarySort] = useState<PlayerSortField>(
    DEFAULT_SORT_SETTINGS.secondarySort,
  );
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [startersVersion, setStartersVersion] = useState(0);
  const [poolVersion, setPoolVersion] = useState(0);
  const [rankPreviewSearch, setRankPreviewSearch] = useState("");

  const load = useCallback(async () => {
    const [metaRes, scoresRes] = await Promise.all([
      fetch(`/api/admin/drafts/${draftId}`),
      fetch(`/api/admin/drafts/${draftId}/scores`),
    ]);
    if (metaRes.ok) {
      const data = await metaRes.json();
      setThresholds(data.draft.rankThresholds);
      setMinQuotasEnabled(data.draft.minQuotasEnabled);
      setMaxQuotasEnabled(data.draft.maxQuotasEnabled);
      setPickOrderMode(data.draft.pickOrderMode === "lowest_avg" ? "lowest_avg" : "snake");
      setShowRanksOnCaptainView(data.draft.displaySettings.showRanksOnCaptainView);
      setHideRanksOnCompleteTeams(data.draft.displaySettings.hideRanksOnCompleteTeams);
      setPlayerRanksEnabled(data.draft.displaySettings.playerRanksEnabled ?? true);
      setRallyModifier(data.draft.displaySettings.rallyModifier ?? "");
      setPublicBoardEnabled(data.draft.displaySettings.publicBoardEnabled ?? false);
      setPublicShowRanks(data.draft.displaySettings.publicShowRanks ?? true);
      setPublicShowSkillRatings(data.draft.displaySettings.publicShowSkillRatings ?? true);
      setPublicRosterSort(data.draft.displaySettings.publicRosterSort ?? "pickOrder");
      setPublicRosterSortDirection(
        data.draft.displaySettings.publicRosterSortDirection === "asc" ? "asc" : "desc",
      );
      setRosterAverageMetric(
        data.draft.displaySettings.rosterAverageMetric === "calc" ? "calc" : "rank",
      );
      setPrimarySort(data.draft.displaySettings.primarySort);
      setSecondarySort(data.draft.displaySettings.secondarySort);
    }
    if (scoresRes.ok) {
      const data = await scoresRes.json();
      setPlayers(data.players ?? []);
    }
  }, [draftId]);

  useEffect(() => {
    void load();
  }, [load, startersVersion, poolVersion]);

  const previewPlayers = useMemo(() => {
    const withPreviewRank = players.map((player) => ({
      ...player,
      scores: {
        ...player.scores,
        rank: assignRank(player.scores.overall, thresholds),
      },
    }));
    return sortDraftPlayers(withPreviewRank, { primarySort: "rank", secondarySort: "lastName" });
  }, [players, thresholds]);

  const filteredPreviewPlayers = useMemo(
    () => filterPlayersByQuery(previewPlayers, rankPreviewSearch),
    [previewPlayers, rankPreviewSearch],
  );

  async function saveSettings() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/drafts/${draftId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rankThresholds: thresholds,
        minQuotasEnabled,
        maxQuotasEnabled,
        pickOrderMode,
        displaySettings: {
          showRanksOnCaptainView,
          hideRanksOnCompleteTeams,
          playerRanksEnabled,
          rallyModifier,
          primarySort,
          secondarySort,
          publicBoardEnabled,
          publicShowRanks,
          publicShowSkillRatings,
          publicRosterSort,
          publicRosterSortDirection,
          rosterAverageMetric,
        },
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not save settings");
      return;
    }
    setMessage("Settings saved");
    await load();
    onSaved?.();
  }

  function onCaptainsChanged() {
    onSaved?.();
  }

  function onPoolChanged() {
    setPoolVersion((v) => v + 1);
    setStartersVersion((v) => v + 1);
    onSaved?.();
  }

  function onStartersChanged() {
    setStartersVersion((v) => v + 1);
    onSaved?.();
  }

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-blue-700">{message}</p> : null}

      <section className="rounded border border-zinc-200 p-4">
        <h2 className="font-medium">Captains</h2>
        <div className="mt-3">
          <DraftCaptainsSection draftId={draftId} onChanged={onCaptainsChanged} />
        </div>
      </section>

      <section className="rounded border border-zinc-200 p-4">
        <h2 className="font-medium">Player pool</h2>
        <div className="mt-3">
          <DraftPoolSection draftId={draftId} onChanged={onPoolChanged} />
        </div>
      </section>

      <section className="rounded border border-zinc-200 p-4">
        <h2 className="font-medium">Starting players</h2>
        <DraftStartersSection draftId={draftId} onChanged={onStartersChanged} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded border border-zinc-200 p-4">
          <h2 className="font-medium">General</h2>
          <div className="mt-4">
            <h3 className="text-sm font-medium">Pick order format</h3>
            <label className="mt-2 flex flex-col gap-1 text-sm">
              Format
              <select
                className="rounded border px-2 py-1"
                value={pickOrderMode}
                onChange={(e) => setPickOrderMode(e.target.value as "snake" | "lowest_avg")}
              >
                <option value="snake">Snake (A–B–C–D–D–C–B–A)</option>
                <option value="lowest_avg">Lowest to highest</option>
              </select>
            </label>
            <p className="mt-1 text-xs text-zinc-500">
              {pickOrderMode === "snake"
                ? "Fixed snake order based on captain pick order."
                : "Each captain picks once per round, lowest roster CALC average first. After picking, captains move under Next round in provisional order by their new average."}
            </p>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium">Player sort order</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                Primary sort
                <select
                  className="rounded border px-2 py-1"
                  value={primarySort}
                  onChange={(e) => setPrimarySort(e.target.value as PlayerSortField)}
                >
                  {PLAYER_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Secondary sort
                <select
                  className="rounded border px-2 py-1"
                  value={secondarySort}
                  onChange={(e) => setSecondarySort(e.target.value as PlayerSortField)}
                >
                  {PLAYER_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={minQuotasEnabled}
              onChange={(e) => setMinQuotasEnabled(e.target.checked)}
            />
            Enforce minimum rank quotas
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={maxQuotasEnabled}
              onChange={(e) => setMaxQuotasEnabled(e.target.checked)}
            />
            Enforce maximum rank quotas
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={playerRanksEnabled}
              onChange={(e) => setPlayerRanksEnabled(e.target.checked)}
            />
            Show player ranks
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            When off, player cards show Rally Index (RAL) instead of rank glyphs. Quotas stay
            internal.
          </p>
          <label
            className={`mt-2 flex items-center gap-2 text-sm ${playerRanksEnabled ? "" : "opacity-50"}`}
          >
            <input
              type="checkbox"
              checked={showRanksOnCaptainView}
              disabled={!playerRanksEnabled}
              onChange={(e) => setShowRanksOnCaptainView(e.target.checked)}
            />
            Show ranks on captain view
          </label>
          <label
            className={`mt-2 flex items-center gap-2 text-sm ${playerRanksEnabled ? "" : "opacity-50"}`}
          >
            <input
              type="checkbox"
              checked={hideRanksOnCompleteTeams}
              disabled={!playerRanksEnabled}
              onChange={(e) => setHideRanksOnCompleteTeams(e.target.checked)}
            />
            Hide player rank on full team cards
          </label>
          <label className="mt-4 flex flex-col gap-1 text-sm">
            Arbitrary Rally Modifier
            <input
              className="rounded border px-2 py-1 font-mono"
              value={rallyModifier}
              onChange={(e) => setRallyModifier(e.target.value)}
              placeholder="e.g. *2, +1, /2, -0.5"
            />
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Display-only shift for Rally Index and CALC-based roster averages. Does not change stored
            scores. Use <code className="rounded bg-zinc-100 px-1">*2</code>,{" "}
            <code className="rounded bg-zinc-100 px-1">+1</code>,{" "}
            <code className="rounded bg-zinc-100 px-1">/2</code>, or{" "}
            <code className="rounded bg-zinc-100 px-1">-0.5</code>.
          </p>
          <fieldset className="mt-4 space-y-2">
            <legend className="text-sm font-medium text-zinc-800">Roster average source</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="rosterAverageMetric"
                checked={rosterAverageMetric === "rank"}
                onChange={() => setRosterAverageMetric("rank")}
              />
              Rank average
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="rosterAverageMetric"
                checked={rosterAverageMetric === "calc"}
                onChange={() => setRosterAverageMetric("calc")}
              />
              CALC average
            </label>
            <p className="text-xs text-zinc-500">
              Both display as &quot;Roster average&quot; on the board. CALC averages also use the
              Rally Modifier when set.
            </p>
          </fieldset>
        </section>

        <section className="rounded border border-zinc-200 p-4">
          <h2 className="font-medium">Public draft board</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Share a read-only TV board at{" "}
            <code className="rounded bg-zinc-100 px-1">
              {leaguePath(leagueSlug || "league", `/draft/${draftId}/public`)}
            </code>{" "}
            without requiring login.
          </p>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publicBoardEnabled}
              onChange={(e) => setPublicBoardEnabled(e.target.checked)}
            />
            Enable public draft board
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publicShowRanks}
              disabled={!publicBoardEnabled}
              onChange={(e) => setPublicShowRanks(e.target.checked)}
            />
            Show ranks and rank quotas
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publicShowSkillRatings}
              disabled={!publicBoardEnabled}
              onChange={(e) => setPublicShowSkillRatings(e.target.checked)}
            />
            Show OFF / DEF / PSY skill ratings
          </label>
          <fieldset className="mt-4 space-y-2" disabled={!publicBoardEnabled}>
            <legend className="text-sm font-medium text-zinc-800">Sort roster players by</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="publicRosterSort"
                checked={publicRosterSort === "pickOrder"}
                onChange={() => setPublicRosterSort("pickOrder")}
              />
              Pick order
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="publicRosterSort"
                checked={publicRosterSort === "calc"}
                onChange={() => setPublicRosterSort("calc")}
              />
              CALC
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="publicRosterSort"
                checked={publicRosterSort === "lastName"}
                onChange={() => setPublicRosterSort("lastName")}
              />
              Last name
            </label>
            <p className="text-xs text-zinc-500">
              CALC sorting uses roster strength without requiring ranks to be visible.
            </p>
          </fieldset>
          <fieldset className="mt-4 space-y-2" disabled={!publicBoardEnabled}>
            <legend className="text-sm font-medium text-zinc-800">Sort direction</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="publicRosterSortDirection"
                checked={publicRosterSortDirection === "desc"}
                onChange={() => setPublicRosterSortDirection("desc")}
              />
              Descending
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="publicRosterSortDirection"
                checked={publicRosterSortDirection === "asc"}
                onChange={() => setPublicRosterSortDirection("asc")}
              />
              Ascending
            </label>
            <p className="text-xs text-zinc-500">
              Also applies to captain and TV board roster cards. For pick order, descending reverses
              draft order.
            </p>
          </fieldset>
        </section>

        <section className="rounded border border-zinc-200">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="font-medium">Rank thresholds</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Minimum CALC score required for each rank. Preview updates as you edit thresholds.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {([2, 3, 4, 5] as const).map((rank) => (
                <label key={rank} className="flex items-center gap-2 text-sm">
                  {formatRank(rank)} ≥
                  <input
                    type="number"
                    step="0.001"
                    className="w-24 rounded border px-2 py-1"
                    value={thresholds[rank]}
                    onChange={(e) =>
                      setThresholds((prev) => ({ ...prev, [rank]: Number(e.target.value) }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
          <ScrollableListCard
            maxHeightClass="max-h-[40vh]"
            searchQuery={rankPreviewSearch}
            onSearchQueryChange={setRankPreviewSearch}
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
                {filteredPreviewPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-zinc-500">
                      No matching players.
                    </td>
                  </tr>
                ) : (
                  filteredPreviewPlayers.map((player) => (
                    <tr key={player.playerId} className="border-t border-zinc-100">
                      <td className="px-3 py-2">
                        {player.lastName}, {player.firstName}
                      </td>
                      <td className="px-3 py-2">
                        <RankGlyph rank={player.scores.rank} size={20} />
                      </td>
                      <td className="px-3 py-2 tabular-nums">{player.scores.overall.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollableListCard>
        </section>
      </div>

      <button
        type="button"
        disabled={busy}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        onClick={saveSettings}
      >
        {busy ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

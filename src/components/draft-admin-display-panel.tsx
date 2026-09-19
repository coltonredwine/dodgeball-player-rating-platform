"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftDisplaySettings } from "@/lib/draft/constants";
import type { RosterAverageMetric } from "@/lib/draft/roster-average";
import type { SortDirection } from "@/lib/draft/roster-sort";

type Props = {
  draftId: string;
  disabled?: boolean;
  onSaved?: () => void;
};

type ViewSettings = Pick<
  DraftDisplaySettings,
  | "showRanksOnCaptainView"
  | "hideRanksOnCompleteTeams"
  | "playerRanksEnabled"
  | "showRallyOnPool"
  | "showRallyOnRoster"
  | "rallyModifier"
  | "groupPoolByRank"
  | "poolRankSortDirection"
  | "primarySort"
  | "secondarySort"
  | "publicBoardEnabled"
  | "publicShowRanks"
  | "publicShowSkillRatings"
  | "publicRosterSort"
  | "publicRosterSortDirection"
  | "rosterAverageMetric"
>;

const DEFAULT_VIEW: ViewSettings = {
  showRanksOnCaptainView: true,
  hideRanksOnCompleteTeams: false,
  playerRanksEnabled: true,
  showRallyOnPool: false,
  showRallyOnRoster: false,
  rallyModifier: "",
  groupPoolByRank: true,
  poolRankSortDirection: "desc",
  primarySort: "rank",
  secondarySort: "lastName",
  publicBoardEnabled: false,
  publicShowRanks: true,
  publicShowSkillRatings: true,
  publicRosterSort: "pickOrder",
  publicRosterSortDirection: "desc",
  rosterAverageMetric: "rank",
};

export function DraftAdminDisplayPanel({ draftId, disabled = false, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<ViewSettings>(DEFAULT_VIEW);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/drafts/${draftId}`);
    if (!res.ok) return;
    const data = await res.json();
    const d = data.draft.displaySettings ?? {};
    setSettings({
      showRanksOnCaptainView: d.showRanksOnCaptainView ?? true,
      hideRanksOnCompleteTeams: d.hideRanksOnCompleteTeams ?? false,
      playerRanksEnabled: d.playerRanksEnabled ?? true,
      showRallyOnPool: d.showRallyOnPool ?? false,
      showRallyOnRoster: d.showRallyOnRoster ?? false,
      rallyModifier: d.rallyModifier ?? "",
      groupPoolByRank: d.groupPoolByRank ?? true,
      poolRankSortDirection: d.poolRankSortDirection === "asc" ? "asc" : "desc",
      primarySort: d.primarySort ?? "rank",
      secondarySort: d.secondarySort ?? "lastName",
      publicBoardEnabled: d.publicBoardEnabled ?? false,
      publicShowRanks: d.publicShowRanks ?? true,
      publicShowSkillRatings: d.publicShowSkillRatings ?? true,
      publicRosterSort: d.publicRosterSort ?? "pickOrder",
      publicRosterSortDirection: d.publicRosterSortDirection === "asc" ? "asc" : "desc",
      rosterAverageMetric: d.rosterAverageMetric === "calc" ? "calc" : "rank",
    });
  }, [draftId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function save(next: ViewSettings) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/drafts/${draftId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displaySettings: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not save display settings");
      return;
    }
    setSettings(next);
    onSaved?.();
  }

  function patch(partial: Partial<ViewSettings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    void save(next);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
        onClick={() => {
          setOpen((value) => !value);
          setMessage(null);
          void load();
        }}
      >
        Display
      </button>
      {open ? (
        <div className="absolute left-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Board display
          </p>
          <div className="mt-2 space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.playerRanksEnabled}
                disabled={busy}
                onChange={(e) => patch({ playerRanksEnabled: e.target.checked })}
              />
              Show player ranks
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showRallyOnPool}
                disabled={busy}
                onChange={(e) => patch({ showRallyOnPool: e.target.checked })}
              />
              Show Rally Index on players list
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showRallyOnRoster}
                disabled={busy}
                onChange={(e) => patch({ showRallyOnRoster: e.target.checked })}
              />
              Show Rally Index on team rosters
            </label>
            <label
              className={`flex items-center gap-2 ${settings.playerRanksEnabled ? "" : "opacity-50"}`}
            >
              <input
                type="checkbox"
                checked={settings.showRanksOnCaptainView}
                disabled={busy || !settings.playerRanksEnabled}
                onChange={(e) => patch({ showRanksOnCaptainView: e.target.checked })}
              />
              Show ranks on captain view
            </label>
            <label
              className={`flex items-center gap-2 ${settings.playerRanksEnabled ? "" : "opacity-50"}`}
            >
              <input
                type="checkbox"
                checked={settings.hideRanksOnCompleteTeams}
                disabled={busy || !settings.playerRanksEnabled}
                onChange={(e) => patch({ hideRanksOnCompleteTeams: e.target.checked })}
              />
              Hide ranks on full team cards
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.groupPoolByRank}
                disabled={busy}
                onChange={(e) => patch({ groupPoolByRank: e.target.checked })}
              />
              Group captain/TV pool by rank
            </label>
            <label className="flex flex-col gap-1">
              Rank group order
              <select
                className="rounded border border-zinc-300 px-2 py-1 text-sm"
                value={settings.poolRankSortDirection}
                disabled={busy}
                onChange={(e) =>
                  patch({
                    poolRankSortDirection: (e.target.value === "asc" ? "asc" : "desc") as SortDirection,
                  })
                }
              >
                <option value="desc">Descending (rank 5 first)</option>
                <option value="asc">Ascending (rank 1 first)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Rally modifier
              <input
                className="rounded border border-zinc-300 px-2 py-1 font-mono text-sm"
                value={settings.rallyModifier}
                disabled={busy}
                placeholder="e.g. *2, +1"
                onChange={(e) => setSettings((prev) => ({ ...prev, rallyModifier: e.target.value }))}
                onBlur={(e) => void save({ ...settings, rallyModifier: e.target.value })}
              />
            </label>
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium text-zinc-800">Roster average source</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="admin-roster-avg"
                  checked={settings.rosterAverageMetric === "rank"}
                  disabled={busy}
                  onChange={() => patch({ rosterAverageMetric: "rank" as RosterAverageMetric })}
                />
                Rank average
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="admin-roster-avg"
                  checked={settings.rosterAverageMetric === "calc"}
                  disabled={busy}
                  onChange={() => patch({ rosterAverageMetric: "calc" as RosterAverageMetric })}
                />
                CALC / Rally average
              </label>
            </fieldset>
            <div className="border-t border-zinc-100 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Public board
              </p>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.publicBoardEnabled}
                    disabled={busy}
                    onChange={(e) => patch({ publicBoardEnabled: e.target.checked })}
                  />
                  Enable public board
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.publicShowRanks}
                    disabled={busy}
                    onChange={(e) => patch({ publicShowRanks: e.target.checked })}
                  />
                  Public: show ranks
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.publicShowSkillRatings}
                    disabled={busy}
                    onChange={(e) => patch({ publicShowSkillRatings: e.target.checked })}
                  />
                  Public: show skill ratings
                </label>
              </div>
            </div>
          </div>
          {busy ? <p className="mt-2 text-xs text-zinc-500">Saving…</p> : null}
          {message ? <p className="mt-2 text-xs text-red-600">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

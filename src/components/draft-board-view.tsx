"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { METRIC_FIELDS } from "@/lib/constants";
import { DraftCurrentPickPanel } from "@/components/draft-current-pick-panel";
import { PickClock } from "@/components/pick-clock";
import { CalcStatGlyph, DefenseStatGlyph, OffenseStatGlyph, PsychStatGlyph } from "@/components/player-stat-glyphs";
import { LeaningIcon } from "@/components/player-leaning-icon";
import { RankGlyph } from "@/components/rank-glyph";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ScrollableListCard } from "@/components/scrollable-list-card";
import { TeamQuotaTable } from "@/components/team-quota-table";
import { filterPlayersByQuery } from "@/lib/player-search";
import type { QuotaLimits } from "@/lib/draft/quotas";
import { areQuotasEnabled } from "@/lib/draft/quotas";
import { RANKS_DESC } from "@/lib/rankings/rank-labels";
import { formatCalcRankDisplay, type RankThresholds } from "@/lib/rankings/thresholds";
import { DraftBoardTvView } from "@/components/draft-board-tv-view";
import { DRAFT_ROOM_CLASS, DRAFT_ROOM_DARK, DRAFT_ROOM_LIGHT } from "@/lib/draft-room-theme";

export type DraftBoardStatus = {
  isLive: boolean;
  draftStatus: string;
  currentPickNumber: number;
  totalPicks: number;
  onClockCaptainName: string | null;
};

type PlayerScores = {
  rank: number;
  overall: number;
  leaning: "offensive" | "defensive" | string;
  displayOffensive: number;
  displayDefensive: number;
  displayPsych: number;
  metrics: Record<string, number>;
};

type TeamState = {
  id: string;
  captainName: string;
  color: string;
  remainingPicks: number;
  roster: Array<{
    playerId: string;
    firstName: string;
    lastName: string;
    link: string | null;
    rank: number;
    leaning: string;
    isStarter: boolean;
  }>;
  targetRosterSize: number;
  stats: {
    avgRank: number | null;
    avgOffensive: number | null;
    avgDefensive: number | null;
    offensiveCount: number;
    defensiveCount: number;
  };
  rankCounts: Record<number, number>;
  quotaNeed: Record<number, number>;
  quotaCap: Record<number, number>;
};

type UndraftedPlayer = {
  playerId: string;
  firstName: string;
  lastName: string;
  link: string | null;
  scores: PlayerScores | null;
};

type DraftStatePayload = {
  draft: {
    name: string;
    isLive: boolean;
    onClockStartedAt: string | null;
    minQuotasEnabled: boolean;
    maxQuotasEnabled: boolean;
    status: string;
    rankThresholds: RankThresholds;
    displaySettings: { hideRanksOnCompleteTeams: boolean };
  };
  currentPickNumber: number;
  totalPicks: number;
  onClockTeamId: string | null;
  turnQueue: Array<{ pickNumber: number; teamId: string; round: number }>;
  pickHistory: Array<{
    pickNumber: number;
    teamId: string;
    captainName: string;
    playerId: string;
    firstName: string;
    lastName: string;
  }>;
  undrafted: UndraftedPlayer[];
  undraftedTotal: number;
  undraftedRankCounts: Record<number, number>;
  teams: TeamState[];
  quotas: Record<number, QuotaLimits>;
  eligibility?: Record<string, boolean>;
  adminPickEligibility?: Record<string, boolean>;
};

type Props = {
  draftId: string;
  mode: "board" | "admin" | "captain";
  captainTeamId?: string | null;
  adminReadOnly?: boolean;
  refreshSignal?: number;
  onStatusChange?: (status: DraftBoardStatus) => void;
};

function AdminPlayerProfile({
  player,
  teams,
  draftTeamId,
  onDraftTeamIdChange,
  onDraft,
  pickBusy,
  pickError,
  canDraft,
  draftBlockedReason,
  quotaForbidden,
  viewOnly = false,
}: {
  player: UndraftedPlayer;
  teams: TeamState[];
  draftTeamId: string;
  onDraftTeamIdChange: (teamId: string) => void;
  onDraft: () => void;
  pickBusy: boolean;
  pickError: string | null;
  canDraft: boolean;
  draftBlockedReason: string | null;
  quotaForbidden: boolean;
  viewOnly?: boolean;
}) {
  const scores = player.scores;
  if (!scores) {
    return <p className="text-sm text-zinc-500">No scores available for this player.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          {player.firstName} {player.lastName}
        </h3>
        {player.link ? (
          <a
            href={player.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-700 underline"
          >
            View link
          </a>
        ) : null}
      </div>

      <div className="rounded border border-zinc-100 bg-zinc-50 p-3 text-sm">
        <p className="font-medium">Ranking</p>
        <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-zinc-700">
          <RankGlyph rank={scores.rank} size={18} />
          <span>· CALC {scores.overall.toFixed(2)} ·</span>
          <LeaningIcon leaning={scores.leaning} />
        </p>
        <p className="mt-1 text-zinc-600">
          OFF {scores.displayOffensive.toFixed(2)} · DEF {scores.displayDefensive.toFixed(2)} · PSY{" "}
          {scores.displayPsych.toFixed(2)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {METRIC_FIELDS.map((field) => (
            <div key={field}>
              <p className="text-xs capitalize text-zinc-500">{field}</p>
              <p className="tabular-nums">{scores.metrics[field]?.toFixed(2) ?? "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {!viewOnly ? (
        <div className="space-y-2 border-t border-zinc-200 pt-4">
          <label className="flex flex-col gap-1 text-sm">
            Draft to team
            <select
              className="rounded border px-2 py-1"
              value={draftTeamId}
              onChange={(event) => onDraftTeamIdChange(event.target.value)}
            >
              <option value="">Select captain…</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id} disabled={team.remainingPicks <= 0}>
                  {team.captainName}
                  {team.remainingPicks <= 0 ? " (roster full)" : ""}
                </option>
              ))}
            </select>
          </label>
          {draftBlockedReason ? <p className="text-xs text-zinc-500">{draftBlockedReason}</p> : null}
          {quotaForbidden ? (
            <p className="text-xs text-red-700">
              This pick is blocked by rank quotas for the on-clock captain. Confirming will force the
              pick anyway.
            </p>
          ) : null}
          {pickError ? <p className="text-sm text-red-700">{pickError}</p> : null}
          <button
            type="button"
            disabled={!canDraft || pickBusy}
            className="w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={onDraft}
          >
            {pickBusy ? "Drafting…" : "Draft to team"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DraftBoardView({
  draftId,
  mode,
  captainTeamId,
  adminReadOnly = false,
  refreshSignal = 0,
  onStatusChange,
}: Props) {
  const [state, setState] = useState<DraftStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [pickBusy, setPickBusy] = useState(false);
  const [undraftedSearch, setUndraftedSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draftTeamId, setDraftTeamId] = useState("");
  const [forcePickConfirmOpen, setForcePickConfirmOpen] = useState(false);
  const teamCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/draft/${draftId}/state`);
      if (!res.ok) throw new Error("Failed to load draft");
      const data = (await res.json()) as DraftStatePayload;
      setState(data);
      setError(null);
      setSelectedPlayerId((current) => {
        if (!current) return current;
        return data.undrafted.some((player) => player.playerId === current) ? current : null;
      });
    } catch {
      setError("Could not load draft state");
    }
  }, [draftId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (refreshSignal === 0) return;
    void refresh();
  }, [refreshSignal, refresh]);

  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => void refresh(), state.draft.isLive ? 2500 : 8000);
    return () => clearInterval(id);
  }, [refresh, state?.draft.isLive]);

  useEffect(() => {
    if (!state?.onClockTeamId) return;
    setDraftTeamId(state.onClockTeamId);
  }, [state?.onClockTeamId]);

  useEffect(() => {
    if (mode !== "admin" || !state?.onClockTeamId) return;
    const onClockTeamId = state.onClockTeamId;
    const frame = requestAnimationFrame(() => {
      const onClockCard = teamCardRefs.current.get(onClockTeamId);
      onClockCard?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, state?.onClockTeamId]);

  useEffect(() => {
    if (!state || !onStatusChange) return;
    const onClockTeam = state.teams.find((team) => team.id === state.onClockTeamId);
    onStatusChange({
      isLive: state.draft.isLive,
      draftStatus: state.draft.status,
      currentPickNumber: state.currentPickNumber,
      totalPicks: state.totalPicks,
      onClockCaptainName: onClockTeam?.captainName ?? null,
    });
  }, [state, onStatusChange]);

  const filteredUndrafted = useMemo(() => {
    if (!state) return [];
    return filterPlayersByQuery(state.undrafted, undraftedSearch);
  }, [state, undraftedSearch]);

  const selectedPlayer = useMemo(() => {
    if (!state || !selectedPlayerId) return null;
    return state.undrafted.find((player) => player.playerId === selectedPlayerId) ?? null;
  }, [state, selectedPlayerId]);

  const draftTeam = state?.teams.find((team) => team.id === draftTeamId);
  const canDraft =
    mode === "admin" &&
    !adminReadOnly &&
    !!selectedPlayer &&
    !!state?.draft.isLive &&
    state.draft.status !== "complete" &&
    draftTeamId === state.onClockTeamId;

  const draftBlockedReason = (() => {
    if (mode !== "admin" || !selectedPlayer) return null;
    if (!state?.draft.isLive) return "Go live to draft players.";
    if (state.draft.status === "complete") return "Draft is complete.";
    if (draftTeamId !== state.onClockTeamId) return "Only the on-clock captain can receive the next pick.";
    return null;
  })();

  function isQuotaForbiddenForOnClock(playerId: string): boolean {
    if (!state || !areQuotasEnabled(state.draft) || !state.onClockTeamId) return false;
    return !(state.adminPickEligibility?.[playerId] ?? true);
  }

  function requestDraftSelectedPlayer() {
    if (!state || !selectedPlayer || !draftTeamId || !canDraft) return;
    if (isQuotaForbiddenForOnClock(selectedPlayer.playerId)) {
      setForcePickConfirmOpen(true);
      return;
    }
    void draftSelectedPlayer();
  }

  async function draftSelectedPlayer() {
    if (!state || !selectedPlayer || !draftTeamId || !canDraft) return;
    setPickBusy(true);
    setPickError(null);
    try {
      const res = await fetch(`/api/admin/drafts/${draftId}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: draftTeamId, playerId: selectedPlayer.playerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPickError(typeof data.error === "string" ? data.error : "Pick failed");
        return;
      }
      setForcePickConfirmOpen(false);
      setSelectedPlayerId(null);
      await refresh();
    } finally {
      setPickBusy(false);
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!state) return <p className="text-zinc-500">Loading draft…</p>;

  if (mode === "board") {
    return <DraftBoardTvView state={state} />;
  }

  const draftState = state;
  const onClock = draftState.teams.find((t) => t.id === draftState.onClockTeamId);
  const isBoard = false;
  const isAdmin = mode === "admin";
  const isDarkRoom = mode === "captain";
  const showDraftCalcDisplay = !isAdmin;
  const theme = isDarkRoom ? DRAFT_ROOM_DARK : DRAFT_ROOM_LIGHT;
  const display = isBoard
    ? {
        rankGlyph: 28,
        rankGlyphSm: 22,
        leaningIcon: 24,
        table: "text-lg",
        tableHead: "text-base font-semibold",
        cell: "px-4 py-3",
        headCell: "px-4 py-3",
        rankSummary: "px-4 pt-3 text-base",
        rankSummaryGap: "gap-3",
        listMaxHeight: "max-h-[75vh]",
        listTitle: "text-2xl font-semibold",
        listHeader: "px-4 py-3",
        cardPad: "p-4",
        cardTitle: "text-2xl font-semibold",
        cardMeta: "text-lg",
        roster: "space-y-0 text-base leading-normal",
        rosterRow: "py-1",
        rosterRankGlyph: 18,
        rosterLeaningIcon: 16,
        stats: "space-y-1.5 text-base",
        cardBorder: 6,
        onClockOutline: 4,
        statusBar: "gap-4 px-5 py-3",
        draftName: "text-3xl font-bold tracking-tight",
        badge: "px-4 py-1.5 text-base font-semibold",
        pickStatus: "text-xl font-medium",
        turnSection: "px-4 py-3",
        turnLabel: "text-sm font-semibold uppercase tracking-wide",
        turnChip: "px-3 py-1.5 text-base font-medium",
        sectionGap: "flex h-full min-h-0 flex-col gap-3",
        gridGap: "gap-4",
        cardSectionGap: "mt-3",
        cardHeaderPad: "",
        cardSectionPad: "",
        cardSectionLabel: "",
      }
    : isAdmin
      ? {
          rankGlyph: 18,
          rankGlyphSm: 13,
          leaningIcon: 12,
          table: "text-sm",
          tableHead: "text-xs",
          cell: "px-3 py-1.5",
          headCell: "px-2 py-2",
          rankSummary: "px-3 pt-2 text-xs",
          rankSummaryGap: "gap-2",
          listMaxHeight: "max-h-full",
          listTitle: "",
          listHeader: "",
          cardPad: "p-2.5",
          cardTitle: "text-sm font-semibold",
          cardMeta: "text-xs leading-snug",
          roster: "space-y-0 text-sm leading-snug",
          rosterRow: "py-1",
          rosterRankGlyph: 18,
          rosterLeaningIcon: 14,
          stats: "space-y-0.5 text-xs leading-snug",
          cardBorder: 4,
          onClockOutline: 2,
          statusBar: "gap-3 px-4 py-3",
          draftName: "text-xl font-semibold",
          badge: "px-2 py-0.5 text-xs font-medium",
          pickStatus: "text-sm",
          turnSection: "p-3",
          turnLabel: "mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500",
          turnChip: "px-2 py-1 text-xs",
          sectionGap: "space-y-3",
          gridGap: "gap-3",
          cardSectionGap: "mt-2",
          cardHeaderPad: "pb-2",
          cardSectionPad: "!p-2",
          cardSectionLabel: "mb-1 pb-1 text-[11px]",
        }
      : {
          rankGlyph: 18,
          rankGlyphSm: 14,
          leaningIcon: 14,
          table: "text-sm",
          tableHead: "text-xs",
          cell: "px-3 py-1.5",
          headCell: "px-2 py-2",
          rankSummary: "px-3 pt-2 text-xs",
          rankSummaryGap: "gap-2",
          listMaxHeight: "max-h-96",
          listTitle: "",
          listHeader: "",
          cardPad: "p-3",
          cardTitle: "font-medium",
          cardMeta: "text-xs",
          roster: "space-y-1 text-sm",
          rosterRow: "py-1.5",
          rosterRankGlyph: 16,
          rosterLeaningIcon: 14,
          stats: "space-y-1 text-xs",
          cardBorder: 4,
          onClockOutline: 2,
          statusBar: "gap-3 px-4 py-3",
          draftName: "text-lg font-semibold",
          badge: "px-2 py-0.5 text-xs font-medium",
          pickStatus: "text-sm",
          turnSection: "p-3",
          turnLabel: "mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500",
          turnChip: "px-2 py-1 text-xs",
          sectionGap: "space-y-4",
          gridGap: "gap-4",
          cardSectionGap: "mt-3",
          cardHeaderPad: "",
          cardSectionPad: "",
          cardSectionLabel: "",
        };

  function isPlayerEligible(player: UndraftedPlayer): boolean {
    if (!areQuotasEnabled(draftState.draft)) return true;
    if (mode === "captain" && captainTeamId) {
      return draftState.eligibility?.[player.playerId] ?? false;
    }
    if (mode === "board" || mode === "admin") {
      return draftState.adminPickEligibility?.[player.playerId] ?? true;
    }
    return true;
  }

  function isAdminQuotaForbidden(player: UndraftedPlayer): boolean {
    return mode === "admin" && areQuotasEnabled(draftState.draft) && !isPlayerEligible(player);
  }

  function undraftedRowClass(player: UndraftedPlayer) {
    const eligible = isPlayerEligible(player);
    const inactive = areQuotasEnabled(draftState.draft) && !eligible && mode !== "admin";
    const quotaForbidden = isAdminQuotaForbidden(player);
    const isSelected = mode === "admin" && selectedPlayerId === player.playerId;
    return [
      inactive
        ? isDarkRoom
          ? "draft-player-inactive"
          : "opacity-40 saturate-[0.35]"
        : "",
      quotaForbidden
        ? isSelected
          ? "bg-red-100 text-red-900 ring-2 ring-inset ring-red-400"
          : "bg-red-50 text-red-900 hover:bg-red-100"
        : "",
      !inactive && !quotaForbidden && isSelected
        ? theme.selectedRow
        : !inactive && !quotaForbidden
          ? theme.hoverRow
          : "",
      mode === "admin" && !adminReadOnly ? "cursor-pointer" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function selectAdminPlayer(playerId: string) {
    if (mode === "admin") setSelectedPlayerId(playerId);
  }

  const rankCountSummary = (
    <div className={display.rankSummary}>
      <div className={`flex flex-wrap ${display.rankSummaryGap} ${theme.rankSummary}`}>
        {RANKS_DESC.map((rank) => (
          <span key={rank} className="inline-flex items-center gap-1.5">
            <RankGlyph rank={rank} size={display.rankGlyphSm} surface={theme.rankGlyphSurface} />
            <span className={isBoard ? "text-xl font-medium tabular-nums" : ""}>
              {state.undraftedRankCounts[rank] ?? 0}
            </span>
          </span>
        ))}
      </div>
    </div>
  );

  const adminUndraftedTable = (
    <ScrollableListCard
      title={`Players (${state.undraftedTotal})`}
      fillHeight
      maxHeightClass={display.listMaxHeight}
      searchQuery={undraftedSearch}
      onSearchQueryChange={setUndraftedSearch}
    >
      {rankCountSummary}
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white text-left text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-2 py-2 font-medium">Rank</th>
            <th className="px-2 py-2 font-medium">Side</th>
          </tr>
        </thead>
        <tbody>
          {filteredUndrafted.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3 py-6 text-center text-zinc-500">
                No matching players.
              </td>
            </tr>
          ) : (
            filteredUndrafted.map((player) => (
              <tr
                key={player.playerId}
                className={undraftedRowClass(player)}
                tabIndex={0}
                role="button"
                onClick={() => selectAdminPlayer(player.playerId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectAdminPlayer(player.playerId);
                  }
                }}
              >
                <td className="border-t border-zinc-100 px-3 py-1.5">
                  {player.firstName} {player.lastName}
                </td>
                <td className="border-t border-zinc-100 px-2 py-1.5">
                  {player.scores ? (
                    <RankGlyph rank={player.scores.rank} size={display.rankGlyph} surface={theme.rankGlyphSurface} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="border-t border-zinc-100 px-2 py-1.5">
                  {player.scores ? <LeaningIcon leaning={player.scores.leaning} /> : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ScrollableListCard>
  );

  const boardUndraftedTable = (
    <ScrollableListCard
      title={`Players (${state.undraftedTotal})`}
      titleClassName={display.listTitle}
      headerClassName={`${theme.scrollHeader} ${display.listHeader}`}
      className={`${theme.scrollCard} ${isDarkRoom ? "[&_h3]:text-[var(--draft-text-high)]" : ""}`}
      fillHeight={isBoard}
      maxHeightClass={display.listMaxHeight}
      searchQuery={isBoard ? undefined : undraftedSearch}
      onSearchQueryChange={isBoard ? undefined : setUndraftedSearch}
    >
      {rankCountSummary}
      <table className={`w-full table-fixed ${display.table} ${isDarkRoom ? "text-[var(--draft-text-high)]" : ""}`}>
        <colgroup>
          <col className={isBoard ? "w-[11rem]" : "w-[9rem]"} />
          <col className="w-14" />
          <col />
          <col />
          <col />
          <col />
        </colgroup>
        <thead
          className={`sticky top-0 z-10 border-b text-left ${theme.tableHead} ${display.tableHead}`}
        >
          <tr>
            <th className={`${display.headCell} font-medium`}>Player</th>
            <th className={`${display.headCell} font-medium`}>Rank</th>
            <th className={`${display.headCell} text-right font-medium`}>
              <span className="inline-flex items-center justify-end gap-1.5">
                OFF
                <OffenseStatGlyph size={display.rankGlyphSm} />
              </span>
            </th>
            <th className={`${display.headCell} text-right font-medium`}>
              <span className="inline-flex items-center justify-end gap-1.5">
                DEF
                <DefenseStatGlyph size={display.rankGlyphSm} />
              </span>
            </th>
            <th className={`${display.headCell} text-right font-medium`}>
              <span className="inline-flex items-center justify-end gap-1.5">
                PSY
                <PsychStatGlyph size={display.rankGlyphSm} />
              </span>
            </th>
            <th className={`${display.headCell} text-right font-medium`}>
              <span className="inline-flex items-center justify-end gap-1.5">
                CAL
                <CalcStatGlyph size={display.rankGlyphSm} />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredUndrafted.length === 0 ? (
            <tr>
              <td colSpan={6} className={`${display.cell} text-center ${theme.empty}`}>
                No matching players.
              </td>
            </tr>
          ) : (
            filteredUndrafted.map((player) => {
              const scores = player.scores;
              return (
                <tr key={player.playerId} className={undraftedRowClass(player)}>
                  <td className={`border-t ${theme.tableRowBorder} ${display.cell} max-w-[11rem] truncate`}>
                    <span className="inline-flex min-w-0 items-center gap-2">
                      {scores ? <LeaningIcon leaning={scores.leaning} size={display.leaningIcon} /> : null}
                      <span className={`truncate ${isBoard || isDarkRoom ? "font-medium" : ""}`}>
                        {player.firstName} {player.lastName}
                      </span>
                    </span>
                  </td>
                  <td className={`border-t ${theme.tableRowBorder} ${display.cell}`}>
                    {scores ? (
                      <RankGlyph rank={scores.rank} size={display.rankGlyph} surface={theme.rankGlyphSurface} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className={`border-t ${theme.tableRowBorder} ${display.cell} text-right tabular-nums ${isBoard ? `font-medium ${theme.scoreEmphasis}` : theme.score}`}
                  >
                    {scores ? scores.displayOffensive.toFixed(2) : "—"}
                  </td>
                  <td
                    className={`border-t ${theme.tableRowBorder} ${display.cell} text-right tabular-nums ${isBoard ? `font-medium ${theme.scoreEmphasis}` : theme.score}`}
                  >
                    {scores ? scores.displayDefensive.toFixed(2) : "—"}
                  </td>
                  <td
                    className={`border-t ${theme.tableRowBorder} ${display.cell} text-right tabular-nums ${isBoard ? `font-medium ${theme.scoreEmphasis}` : theme.score}`}
                  >
                    {scores ? scores.displayPsych.toFixed(2) : "—"}
                  </td>
                  <td
                    className={`border-t ${theme.tableRowBorder} ${display.cell} text-right tabular-nums ${isBoard ? `font-semibold ${theme.scoreCalc}` : theme.score}`}
                  >
                    {scores
                      ? showDraftCalcDisplay
                        ? formatCalcRankDisplay(
                            scores.overall,
                            scores.rank,
                            draftState.draft.rankThresholds,
                          )
                        : scores.overall.toFixed(2)
                      : "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </ScrollableListCard>
  );

  const undraftedList = mode === "admin" ? adminUndraftedTable : boardUndraftedTable;
  const showUndraftedPool =
    mode === "captain" ? false : isBoard ? state.undraftedTotal > 0 : true;

  const teamsGrid = (
    <div
      className={
        mode === "captain"
          ? `flex h-full min-h-0 items-start ${display.gridGap} pb-2`
          : isBoard || isAdmin
            ? `flex h-full min-h-0 ${display.gridGap}${isAdmin ? " overflow-x-auto scroll-px-3 px-3 pb-1" : ""}`
            : `grid ${display.gridGap} sm:grid-cols-2`
      }
    >
      {state.teams.map((team) => {
        const hideRosterRank =
          draftState.draft.displaySettings.hideRanksOnCompleteTeams && team.remainingPicks <= 0;
        const isCaptainTeam = mode === "captain" && team.id === captainTeamId;
        const captainCardFlexClass =
          mode === "captain"
            ? isCaptainTeam
              ? "min-w-0 flex-[1.28] basis-0 h-[calc(100%+1.5rem)]"
              : "min-h-0 min-w-0 flex-1 basis-0 h-full"
            : isBoard || isAdmin
              ? "min-h-0 min-w-0 flex-1 basis-0"
              : "";
        return (
        <div
          key={team.id}
          ref={(node) => {
            if (node) teamCardRefs.current.set(team.id, node);
            else teamCardRefs.current.delete(team.id);
          }}
          className={[
            `flex flex-col overflow-hidden rounded border ${theme.cardBorder} ${theme.card}`,
            isCaptainTeam && mode === "captain" ? "p-4" : display.cardPad,
            captainCardFlexClass,
            isAdmin ? "min-w-[11rem] bg-white shadow-sm ring-1 ring-zinc-200/90" : "",
            team.id === state.onClockTeamId && isDarkRoom ? "draft-on-clock-glow" : "",
            isCaptainTeam ? "relative z-[1] shadow-lg shadow-[var(--draft-shadow)] ring-2 ring-[var(--draft-divider)]" : "",
          ].join(" ")}
          style={{
            borderTopWidth: isCaptainTeam ? Math.max(display.cardBorder, 6) : display.cardBorder,
            borderTopColor: team.color,
            ...(isCaptainTeam
              ? ({ backgroundColor: `color-mix(in srgb, ${team.color} 14%, var(--draft-surface-2))` } as CSSProperties)
              : {}),
            ...(team.id === state.onClockTeamId
              ? isDarkRoom
                ? ({ "--on-clock-color": team.color } as CSSProperties)
                : {
                    outline: `${display.onClockOutline}px solid ${team.color}`,
                    boxShadow: isAdmin ? `0 0 0 1px ${team.color}33, 0 4px 14px ${team.color}22` : undefined,
                  }
              : {}),
          }}
        >
          <div className={`${isBoard ? "shrink-0" : ""} ${theme.cardHeader} ${display.cardHeaderPad}`}>
            <h3
              className={`${display.cardTitle}${isCaptainTeam ? " font-semibold" : ""}${
                isCaptainTeam && mode === "captain" ? " text-base" : ""
              }`}
            >
              {team.captainName}
            </h3>
            <p
              className={`mt-1 ${theme.cardMeta} ${display.cardMeta}${
                isCaptainTeam && mode === "captain" ? " text-sm" : ""
              }`}
            >
              {team.roster.length}/{team.targetRosterSize} players
            </p>
            {areQuotasEnabled(state.draft) ? (
              <div className={`mt-2 ${display.cardMeta}`}>
                <TeamQuotaTable
                  quotaNeed={team.quotaNeed}
                  quotaCap={team.quotaCap}
                  showNeed={state.draft.minQuotasEnabled}
                  showCap={state.draft.maxQuotasEnabled}
                  maxQuotasEnabled={state.draft.maxQuotasEnabled}
                  rankGlyphSize={isCaptainTeam && mode === "captain" ? display.rankGlyphSm + 2 : display.rankGlyphSm}
                  rankGlyphSurface={theme.rankGlyphSurface}
                  labelClassName={theme.cardMeta}
                  headerClassName={theme.cardMeta}
                  cellClassName={`${theme.cardStats} tabular-nums`}
                  borderClassName={isAdmin ? "border-zinc-200" : "border-[color:var(--draft-divider)]"}
                />
              </div>
            ) : null}
          </div>

          <div className={`${display.cardSectionGap} flex min-h-0 flex-1 flex-col ${theme.cardSection} ${display.cardSectionPad}`}>
            <p className={`${theme.cardSectionLabel} ${display.cardSectionLabel}`}>Roster</p>
            <ul className={`min-h-0 flex-1 ${isBoard || isAdmin || mode === "captain" ? "overflow-y-auto" : ""} ${display.roster}`}>
              {team.roster.length === 0 ? (
                <li className={`${isBoard ? "py-1" : "py-2"} text-sm ${theme.cardStatsMuted}`}>No picks yet.</li>
              ) : (
                team.roster.map((p) => (
                  <li
                    key={p.playerId}
                    className={`flex items-center justify-between gap-1.5 border-b ${display.rosterRow} last:border-b-0 ${theme.tableRowBorder}`}
                  >
                    <span className={`min-w-0 truncate ${isBoard || isAdmin || mode === "captain" ? "font-medium" : ""}`}>
                      {p.firstName} {p.lastName}
                      {p.isStarter ? " *" : ""}
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1 ${theme.rosterMuted}`}>
                      {!hideRosterRank ? (
                        <RankGlyph
                          rank={p.rank}
                          size={display.rosterRankGlyph}
                          surface={theme.rankGlyphSurface}
                        />
                      ) : null}
                      <LeaningIcon leaning={p.leaning} size={display.rosterLeaningIcon} />
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {!isAdmin ? (
            <div className={`${display.cardSectionGap} shrink-0 text-center ${theme.cardSection} ${theme.cardStats} ${display.stats} ${display.cardSectionPad}`}>
              <p className={`${theme.cardSectionLabel} text-center ${display.cardSectionLabel}`}>Team stats</p>
              {team.stats.avgRank != null ? (
                <p className="tabular-nums">Roster average: {team.stats.avgRank.toFixed(2)}</p>
              ) : (
                <p className={theme.cardStatsMuted}>Roster average: —</p>
              )}
              <div className="mt-1 flex flex-col items-center gap-1">
                <p>Roster Balance</p>
                <p className="flex items-center justify-center gap-1.5 tabular-nums">
                  {team.stats.offensiveCount}
                  <LeaningIcon leaning="offensive" size={display.leaningIcon} />
                  {team.stats.avgOffensive != null ? team.stats.avgOffensive.toFixed(2) : "—"}
                </p>
                <p className="flex items-center justify-center gap-1.5 tabular-nums">
                  {team.stats.defensiveCount}
                  <LeaningIcon leaning="defensive" size={display.leaningIcon} />
                  {team.stats.avgDefensive != null ? team.stats.avgDefensive.toFixed(2) : "—"}
                </p>
              </div>
            </div>
          ) : null}
        </div>
        );
      })}
    </div>
  );

  const currentPickPanel =
    onClock && state.turnQueue.length > 0 ? (
      <DraftCurrentPickPanel
        onClockTeamId={state.onClockTeamId}
        turnQueue={state.turnQueue}
        teams={state.teams}
        isLive={state.draft.isLive}
        onClockStartedAt={state.draft.onClockStartedAt}
        layout={isBoard || mode === "captain" ? "horizontal" : "vertical"}
        singleLineQueue={isBoard || mode === "captain"}
        className={isBoard || mode === "captain" ? "shrink-0" : undefined}
      />
    ) : null;

  const adminTurnQueuePanel =
    onClock && state.turnQueue.length > 0 ? (
      <div className={`rounded border-2 ${theme.turnSection} ${display.turnSection}`}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {state.turnQueue.slice(0, 3).map((slot, index) => {
            const team = state.teams.find((t) => t.id === slot.teamId);
            const isCurrent = index === 0;
            return (
              <div
                key={slot.pickNumber}
                className={`flex min-w-0 flex-col justify-center rounded px-3 py-2 ${
                  isCurrent ? "bg-zinc-50 ring-2 ring-zinc-300" : "border border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className={`${display.turnLabel} ${theme.turnLabel} !mb-0`}>
                    {isCurrent ? "Current pick" : "Up next"}
                  </p>
                  {isCurrent ? (
                    <PickClock
                      isLive={state.draft.isLive}
                      startedAt={state.draft.onClockStartedAt}
                      tone="light"
                      className="text-xs"
                    />
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm font-semibold">
                  #{slot.pickNumber} {team?.captainName}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      <div className="rounded border border-zinc-200 bg-white p-3 text-sm text-zinc-500 shadow-sm">
        {state.draft.status === "complete" ? "Draft complete." : "Waiting for next pick."}
      </div>
    );

  const playerProfilePanel = (
    <section className="flex min-h-0 min-w-0 flex-col overflow-y-auto rounded border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="font-medium">Player profile</h3>
      {selectedPlayer ? (
        <div className="mt-3">
          <AdminPlayerProfile
            player={selectedPlayer}
            teams={state.teams}
            draftTeamId={draftTeamId}
            onDraftTeamIdChange={setDraftTeamId}
            onDraft={() => requestDraftSelectedPlayer()}
            pickBusy={pickBusy}
            pickError={pickError}
            canDraft={canDraft}
            draftBlockedReason={draftBlockedReason}
            quotaForbidden={isQuotaForbiddenForOnClock(selectedPlayer.playerId)}
            viewOnly={adminReadOnly}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          {adminReadOnly
            ? "Select a player from the list to view their profile."
            : "Select a player from the list to view their profile and draft them to a team."}
        </p>
      )}
    </section>
  );

  const onClockCaptainName = onClock?.captainName ?? "the on-clock captain";

  return (
    <div
      className={`${display.sectionGap} ${theme.root} ${isDarkRoom ? DRAFT_ROOM_CLASS : ""} ${isBoard ? "h-full min-h-0" : ""}`}
    >
      <ConfirmDialog
        open={forcePickConfirmOpen}
        title="Force quota-blocked pick?"
        message={`${selectedPlayer?.firstName ?? ""} ${selectedPlayer?.lastName ?? ""} is blocked by rank quotas for ${onClockCaptainName}. Force this pick anyway?`}
        confirmLabel="Force pick"
        pending={pickBusy}
        confirmClassName="bg-red-600"
        onConfirm={() => void draftSelectedPlayer()}
        onCancel={() => setForcePickConfirmOpen(false)}
      />
      {isAdmin ? (
        <div
          className={`grid min-h-0 ${display.gridGap} xl:grid-cols-[minmax(240px,280px)_minmax(340px,1fr)_minmax(480px,2fr)] xl:grid-rows-[auto_minmax(0,1fr)] xl:h-[72vh] xl:max-h-[calc(100vh-11rem)] xl:overflow-hidden`}
        >
          <div className="min-w-0 xl:col-span-2 xl:col-start-1 xl:row-start-1">{adminTurnQueuePanel}</div>

          <div className="flex min-h-0 min-w-0 flex-col xl:col-start-3 xl:row-start-1 xl:row-span-2">
            {teamsGrid}
          </div>

          <div className="flex max-h-[50vh] min-h-0 min-w-0 flex-col overflow-hidden xl:col-start-1 xl:row-start-2 xl:h-full xl:max-h-none">
            {undraftedList}
          </div>

          <div className="min-h-0 min-w-0 overflow-hidden xl:col-start-2 xl:row-start-2 xl:h-full xl:max-h-none">
            {playerProfilePanel}
          </div>
        </div>
      ) : (
        <>
          {mode !== "captain" ? (
            <div
              className={`${isBoard ? "shrink-0" : ""} flex flex-wrap items-center rounded border ${theme.statusBar} ${display.statusBar}`}
            >
              <h2 className={display.draftName}>{state.draft.name}</h2>
              {!state.draft.isLive ? (
                <span className={`rounded ${theme.badgeNotLive} ${display.badge}`}>Not live</span>
              ) : (
                <span className={`rounded ${theme.badgeLive} ${display.badge}`}>Live</span>
              )}
              <span className={`inline-flex flex-wrap items-center gap-2 ${display.pickStatus} ${theme.pickStatus}`}>
                <span>
                  Pick {Math.min(state.currentPickNumber, state.totalPicks)} / {state.totalPicks}
                  {onClock
                    ? ` — ${onClock.captainName}'s turn`
                    : state.draft.status === "complete"
                      ? " — Complete"
                      : ""}
                </span>
                {onClock ? (
                  <PickClock
                    isLive={state.draft.isLive}
                    startedAt={state.draft.onClockStartedAt}
                    tone={isDarkRoom ? "dark" : "light"}
                  />
                ) : null}
              </span>
            </div>
          ) : null}

          {currentPickPanel}

          <div
            className={`grid ${display.gridGap} ${
              isBoard
                ? showUndraftedPool
                  ? "min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] overflow-hidden"
                  : "min-h-0 flex-1 grid-cols-1 overflow-hidden"
                : mode === "captain"
                  ? "min-h-0 flex-1 grid-cols-1 overflow-visible"
                  : "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.4fr)]"
            }`}
          >
            {showUndraftedPool ? (
              <div className={isBoard ? "flex min-h-0 flex-col" : undefined}>{undraftedList}</div>
            ) : null}
            <div
              className={
                isBoard || mode === "captain"
                  ? `flex h-full min-h-0 flex-col${mode === "captain" ? " overflow-visible" : ""}`
                  : undefined
              }
            >
              {teamsGrid}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

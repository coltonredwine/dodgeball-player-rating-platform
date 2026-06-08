"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AppNav } from "@/components/app-nav";
import {
  CaptainBookmarkButton,
  CaptainPlayerPickActions,
} from "@/components/captain-pick-controls";
import { DraftBoardTvView } from "@/components/draft-board-tv-view";
import { PlayerAvatar } from "@/components/player-avatar";
import { PlayerSearchInput } from "@/components/player-search-input";
import { MobileCaptainLayout } from "@/components/mobile-captain-layout";
import { TeamQuotaTable } from "@/components/team-quota-table";
import { LeaningIcon } from "@/components/player-leaning-icon";
import { CalcStatGlyph, DefenseStatGlyph, OffenseStatGlyph, PsychStatGlyph } from "@/components/player-stat-glyphs";
import { RankGlyph } from "@/components/rank-glyph";
import { formatRankAverage } from "@/lib/rankings/rank-labels";
import { formatCalcRankDisplay, type RankThresholds } from "@/lib/rankings/thresholds";
import { DRAFT_ROOM_DARK } from "@/lib/draft-room-theme";
import type { QuotaLimits } from "@/lib/draft/quotas";
import { CaptainPoolSortControl } from "@/components/captain-pool-sort-control";
import { PlayerPoolRankSections } from "@/components/player-pool-rank-sections";
import { sortUndraftedWithBookmarks } from "@/lib/draft/bookmarks";
import { groupPoolPlayersIntoSections } from "@/lib/draft/pool-sections";
import {
  DEFAULT_CAPTAIN_POOL_SORT,
  sortPoolSectionsByField,
  type CaptainPoolSortField,
} from "@/lib/draft/pool-sort";
import { areQuotasEnabled } from "@/lib/draft/quotas";
import { filterPlayersByQuery } from "@/lib/player-search";
import type { AppNavData } from "@/lib/nav";

type PlayerRow = {
  playerId: string;
  firstName: string;
  lastName: string;
  link: string | null;
  scores: {
    rank: number;
    leaning: string;
    overall: number;
    displayOffensive: number;
    displayDefensive: number;
    displayPsych: number;
  } | null;
  drafted?: boolean;
};

type TeamRow = {
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
  quotaNeed: Record<number, number>;
  quotaCap: Record<number, number>;
  stats: {
    avgRank: number | null;
    avgOffensive: number | null;
    avgDefensive: number | null;
    offensiveCount: number;
    defensiveCount: number;
  };
};

type DraftStateResponse = {
  draft: {
    name: string;
    isLive: boolean;
    onClockStartedAt: string | null;
    minQuotasEnabled: boolean;
    maxQuotasEnabled: boolean;
    status: string;
    rankThresholds: RankThresholds;
    displaySettings: {
      showRanksOnCaptainView: boolean;
      hideRanksOnCompleteTeams: boolean;
    };
  };
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
  teams: TeamRow[];
  quotas: Record<number, QuotaLimits>;
  undrafted: PlayerRow[];
  undraftedTotal: number;
  undraftedRankCounts: Record<number, number>;
  currentPickNumber: number;
  totalPicks: number;
  captainTeamId: string | null;
  flaggedPlayerIds: string[];
  eligibility: Record<string, boolean>;
  isCaptainTurn: boolean;
};

const theme = DRAFT_ROOM_DARK;

function formatPlayerCalc(
  scores: NonNullable<PlayerRow["scores"]>,
  thresholds: RankThresholds,
): string {
  return formatCalcRankDisplay(scores.overall, scores.rank, thresholds);
}

function MobilePlayerExpandedStats({
  scores,
  isSaved,
  onToggleSave,
}: {
  scores: NonNullable<PlayerRow["scores"]>;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <div className={`border-t px-3 py-2 text-sm tabular-nums ${theme.panelDivider} ${theme.cardStats}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <OffenseStatGlyph size={14} />
            {scores.displayOffensive.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <DefenseStatGlyph size={14} />
            {scores.displayDefensive.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <PsychStatGlyph size={14} />
            {scores.displayPsych.toFixed(1)}
          </span>
        </div>
        <CaptainBookmarkButton active={isSaved} onClick={onToggleSave} />
      </div>
    </div>
  );
}

function CaptainPickPanel({
  state,
  pendingPickId,
  setPendingPickId,
  expandedId,
  setExpandedId,
  onFlag,
  onConfirm,
  onOpenTeam,
  error,
  variant,
}: {
  state: DraftStateResponse;
  pendingPickId: string | null;
  setPendingPickId: (id: string | null) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onFlag: (playerId: string) => void;
  onConfirm: () => void;
  onOpenTeam?: () => void;
  error: string | null;
  variant: "mobile" | "desktop";
}) {
  const myTeam = state.teams.find((t) => t.id === state.captainTeamId);
  const canPick = state.isCaptainTurn && state.draft.isLive;
  const showRanks = state.draft.displaySettings.showRanksOnCaptainView;
  const isMobile = variant === "mobile";
  const [search, setSearch] = useState("");
  const [poolSort, setPoolSort] = useState<CaptainPoolSortField>(DEFAULT_CAPTAIN_POOL_SORT);
  const poolPlayers = useMemo(() => {
    let players = sortUndraftedWithBookmarks(state.undrafted, state.flaggedPlayerIds);
    if (isMobile) {
      players = filterPlayersByQuery(players, search);
    }
    return players;
  }, [isMobile, search, state.flaggedPlayerIds, state.undrafted]);
  const poolSections = useMemo(() => {
    const sections = groupPoolPlayersIntoSections(poolPlayers, {
      bookmarkIds: state.flaggedPlayerIds,
    });
    return sortPoolSectionsByField(sections, poolSort);
  }, [poolPlayers, poolSort, state.flaggedPlayerIds]);

  function handleChoose(playerId: string) {
    setPendingPickId(playerId);
  }

  function handleCancel() {
    setPendingPickId(null);
  }

  return (
    <div className={`space-y-4 ${isMobile ? "p-4 pb-8" : ""}`}>
      {myTeam && !isMobile ? (
        <div
          className={`rounded border ${theme.cardBorder} ${theme.card} p-4`}
          style={{ borderTopColor: myTeam.color, borderTopWidth: 4 }}
        >
          <h2 className="text-lg font-semibold">Your team</h2>
          <p className={`mt-1 text-sm ${theme.cardMeta}`}>
            {myTeam.roster.length}/{myTeam.targetRosterSize}
            {myTeam.stats.avgRank != null ? ` · Avg ${formatRankAverage(myTeam.stats.avgRank)}` : ""}
          </p>
        </div>
      ) : null}

      {myTeam && isMobile && onOpenTeam ? (
        <button
          type="button"
          className={`w-full rounded border text-left ${theme.cardBorder} ${theme.card} p-4 transition-colors hover:bg-[var(--draft-hover)]`}
          style={{ borderTopColor: myTeam.color, borderTopWidth: 4 }}
          onClick={onOpenTeam}
        >
          <p className="text-base font-semibold">
            {myTeam.captainName}
            <span className={`ml-2 text-sm font-normal ${theme.cardMeta}`}>
              {myTeam.roster.length}/{myTeam.targetRosterSize}
            </span>
          </p>
          {areQuotasEnabled(state.draft) && myTeam ? (
            <div className="mt-2">
              <TeamQuotaTable
                quotaNeed={myTeam.quotaNeed}
                quotaCap={myTeam.quotaCap}
                showNeed={state.draft.minQuotasEnabled}
                showCap={state.draft.maxQuotasEnabled}
                maxQuotasEnabled={state.draft.maxQuotasEnabled}
                rankGlyphSize={22}
                rankGlyphSurface={theme.rankGlyphSurface}
                labelClassName={theme.cardMeta}
                headerClassName={theme.cardMeta}
                cellClassName={`${theme.cardStats} tabular-nums`}
              />
            </div>
          ) : null}
          <p className={`mt-1 text-xs ${theme.cardMeta}`}>Swipe left or tap to view roster →</p>
        </button>
      ) : null}

      {canPick ? (
        <p className="rounded bg-green-950/80 px-4 py-3 text-center text-sm font-medium text-green-300 ring-1 ring-green-800/80">
          Your pick — choose a player
        </p>
      ) : null}

      {isMobile ? (
        <PlayerSearchInput
          value={search}
          onChange={setSearch}
          className="w-full rounded-lg border border-[var(--draft-divider)] bg-[var(--draft-surface-1)] px-3 py-2 text-sm text-[var(--draft-text-high)] placeholder:text-[var(--draft-text-disabled)]"
        />
      ) : null}

      {poolPlayers.length > 0 ? (
        <CaptainPoolSortControl value={poolSort} onChange={setPoolSort} />
      ) : null}

      <div className="space-y-1 lg:space-y-2">
        {poolPlayers.length === 0 ? (
          <p className="text-sm text-[var(--draft-text-disabled)]">
            {search ? "No matching players." : "No players available."}
          </p>
        ) : (
        <PlayerPoolRankSections
          sections={poolSections}
          rankGlyphSurface={theme.rankGlyphSurface}
          renderPlayer={(p, section) => {
          const eligible = areQuotasEnabled(state.draft)
            ? (state.eligibility[p.playerId] ?? false)
            : true;
          const inactive = areQuotasEnabled(state.draft) && !eligible;
          const showChoose = eligible;
          const chooseDisabled = !canPick;
          const isPending = pendingPickId === p.playerId;
          const isExpanded = expandedId === p.playerId;
          const isSaved = state.flaggedPlayerIds.includes(p.playerId);
          const savedHighlight = isSaved && !inactive;
          const showRankInCard = showRanks && section.kind !== "rank";

          return (
            <div
              key={p.playerId}
              className={[
                `rounded border ${theme.cardBorder} ${theme.card}`,
                inactive ? "draft-player-inactive" : "",
                isPending ? "border-green-600/80 bg-green-950/30 ring-1 ring-green-700/60" : "",
                savedHighlight && !isPending ? "draft-captain-saved-player" : "",
              ].join(" ")}
            >
              <div className="hidden items-center gap-3 px-3 py-2 text-sm lg:flex">
                <CaptainBookmarkButton active={isSaved} onClick={() => onFlag(p.playerId)} />
                {p.scores ? <LeaningIcon leaning={p.scores.leaning} size={16} /> : null}
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.firstName} {p.lastName}
                </span>
                {p.scores ? (
                  <>
                    {showRankInCard ? (
                      <RankGlyph rank={p.scores.rank} size={18} surface={theme.rankGlyphSurface} />
                    ) : null}
                    <span className={`inline-flex shrink-0 items-center gap-1 tabular-nums ${theme.cardStats}`}>
                      <OffenseStatGlyph size={14} />
                      {p.scores.displayOffensive.toFixed(2)}
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1 tabular-nums ${theme.cardStats}`}>
                      <DefenseStatGlyph size={14} />
                      {p.scores.displayDefensive.toFixed(2)}
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1 tabular-nums ${theme.cardStats}`}>
                      <PsychStatGlyph size={14} />
                      {p.scores.displayPsych.toFixed(2)}
                    </span>
                    <span className={`shrink-0 ${theme.cardMeta}`}>|</span>
                    <span className={`inline-flex shrink-0 items-center gap-1 tabular-nums ${theme.cardStats}`}>
                      <CalcStatGlyph size={14} />
                      {formatPlayerCalc(p.scores, state.draft.rankThresholds)}
                    </span>
                  </>
                ) : null}
                <CaptainPlayerPickActions
                  playerId={p.playerId}
                  showChoose={showChoose}
                  chooseDisabled={chooseDisabled}
                  isPending={isPending}
                  onChoose={handleChoose}
                  onConfirm={onConfirm}
                  onCancel={handleCancel}
                />
              </div>

              <div className="lg:hidden">
                <div className="flex items-center gap-2 px-3 py-2">
                  <PlayerAvatar
                    playerId={p.playerId}
                    link={p.link}
                    name={`${p.firstName} ${p.lastName}`}
                    size={36}
                  />
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : p.playerId)}
                  >
                    <span className="truncate font-medium">
                      {p.firstName} {p.lastName}
                    </span>
                    {p.scores && showRankInCard ? (
                      <RankGlyph rank={p.scores.rank} size={18} surface={theme.rankGlyphSurface} />
                    ) : null}
                  </button>
                  {p.scores ? (
                    <LeaningIcon leaning={p.scores.leaning} size={20} monochrome className="shrink-0" />
                  ) : null}
                  <CaptainPlayerPickActions
                    playerId={p.playerId}
                    showChoose={showChoose}
                    chooseDisabled={chooseDisabled}
                    isPending={isPending}
                    onChoose={handleChoose}
                    onConfirm={onConfirm}
                    onCancel={handleCancel}
                  />
                </div>
                {isExpanded && p.scores ? (
                  <MobilePlayerExpandedStats
                    scores={p.scores}
                    isSaved={isSaved}
                    onToggleSave={() => onFlag(p.playerId)}
                  />
                ) : null}
              </div>
            </div>
          );
        }}
        />
        )}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

export function CaptainPickView({ draftId, nav }: { draftId: string; nav: AppNavData }) {
  const [state, setState] = useState<DraftStateResponse | null>(null);
  const [pendingPickId, setPendingPickId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openTeamRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/draft/${draftId}/state`);
    if (!res.ok) return;
    const data = (await res.json()) as DraftStateResponse;
    setState(data);
  }, [draftId]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), state?.draft.isLive ? 2500 : 8000);
    return () => clearInterval(id);
  }, [refresh, state?.draft.isLive]);

  async function toggleFlag(playerId: string) {
    const flagged = state?.flaggedPlayerIds.includes(playerId);
    await fetch(`/api/draft/${draftId}/flags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, flagged: !flagged }),
    });
    refresh();
  }

  async function confirmPick() {
    if (!pendingPickId) return;
    setError(null);
    const res = await fetch(`/api/draft/${draftId}/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: pendingPickId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Pick failed");
      return;
    }
    setPendingPickId(null);
    refresh();
  }

  async function updateTeamColor(color: string) {
    setError(null);
    const res = await fetch(`/api/draft/${draftId}/team-color`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not update team color");
      return;
    }
    await refresh();
  }

  if (!state) return <p className={`p-4 ${theme.empty}`}>Loading…</p>;

  const canPick = state.isCaptainTurn && state.draft.isLive;
  const myTeam = state.captainTeamId
    ? state.teams.find((team) => team.id === state.captainTeamId) ?? null
    : null;
  const teamColorLocked = state.draft.status === "complete";

  const panelProps = {
    state,
    pendingPickId,
    setPendingPickId,
    expandedId,
    setExpandedId,
    onFlag: toggleFlag,
    onConfirm: confirmPick,
    error,
  };

  return (
    <div
      className={
        canPick
          ? "draft-captain-viewport-glow flex min-h-screen flex-col lg:h-dvh lg:overflow-hidden"
          : "flex min-h-screen flex-col lg:h-dvh lg:overflow-hidden"
      }
      style={canPick ? ({ "--captain-turn-color": "#d4af37" } as CSSProperties) : undefined}
    >
      <div className={`border-b ${theme.panelDivider}`}>
        <AppNav
          {...nav}
          tone="draft-room"
          fullWidth
          draftStatusDesktopOnly
          teamColor={
            myTeam
              ? {
                  value: myTeam.color,
                  takenColors: state.teams
                    .filter((team) => team.id !== myTeam.id)
                    .map((team) => team.color),
                  disabled: teamColorLocked,
                  onChange: (color) => void updateTeamColor(color),
                }
              : undefined
          }
          draftStatus={
            state
              ? {
                  name: state.draft.name,
                  isLive: state.draft.isLive,
                  currentPickNumber: state.currentPickNumber,
                  totalPicks: state.totalPicks,
                }
              : undefined
          }
        />
      </div>

      <div className="lg:hidden">
        <MobileCaptainLayout
          state={state}
          showRanks={state.draft.displaySettings.showRanksOnCaptainView}
          onOpenTeamRef={openTeamRef}
        >
          <CaptainPickPanel
            {...panelProps}
            variant="mobile"
            onOpenTeam={() => openTeamRef.current?.()}
          />
        </MobileCaptainLayout>
      </div>

      <section className="hidden min-h-0 flex-1 flex-col px-3 pb-3 pt-2 sm:px-4 lg:flex">
        <DraftBoardTvView
          state={state}
          captain={{
            captainTeamId: state.captainTeamId,
            flaggedPlayerIds: state.flaggedPlayerIds,
            eligibility: state.eligibility,
            isCaptainTurn: state.isCaptainTurn,
            showRanksOnCaptainView: state.draft.displaySettings.showRanksOnCaptainView,
            pendingPickId,
            pickError: error,
            onChoosePlayer: setPendingPickId,
            onConfirmPick: () => void confirmPick(),
            onCancelPick: () => setPendingPickId(null),
            onToggleFlag: (playerId) => void toggleFlag(playerId),
          }}
        />
      </section>
    </div>
  );
}

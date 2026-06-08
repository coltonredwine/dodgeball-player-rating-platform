"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode } from "react";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamQuotaTable } from "@/components/team-quota-table";
import { LeaningIcon } from "@/components/player-leaning-icon";
import { PickClock } from "@/components/pick-clock";
import { RankGlyph } from "@/components/rank-glyph";
import { resolveGhostRosterPlayers } from "@/lib/draft/bookmarks";
import { areQuotasEnabled } from "@/lib/draft/quotas";
import { DRAFT_ROOM_DARK } from "@/lib/draft-room-theme";

type TeamState = {
  id: string;
  captainName: string;
  color: string;
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
  stats: { avgRank: number | null };
};

type PickHistoryEntry = {
  pickNumber: number;
  teamId: string;
  captainName: string;
  firstName: string;
  lastName: string;
};

type TurnQueueSlot = { pickNumber: number; teamId: string; round: number };

type UndraftedPlayer = {
  playerId: string;
  firstName: string;
  lastName: string;
  link: string | null;
  scores: { rank: number; leaning: string } | null;
};

const MOBILE_ROSTER_AVATAR_SIZE = 32;

export type MobileCaptainState = {
  draft: {
    isLive: boolean;
    minQuotasEnabled: boolean;
    maxQuotasEnabled: boolean;
    onClockStartedAt: string | null;
  };
  onClockTeamId: string | null;
  captainTeamId: string | null;
  isCaptainTurn: boolean;
  teams: TeamState[];
  turnQueue: TurnQueueSlot[];
  pickHistory: PickHistoryEntry[];
  flaggedPlayerIds: string[];
  undrafted: UndraftedPlayer[];
};

const theme = DRAFT_ROOM_DARK;
const PICK_BAR_HEIGHT = "3.25rem";
const CAROUSEL_SIDE = "0.75rem";
const CAROUSEL_PEEK = "0.625rem";
const CAROUSEL_PANEL_WIDTH = `calc(100vw - ${CAROUSEL_SIDE} - ${CAROUSEL_SIDE} - ${CAROUSEL_PEEK})`;
const carouselPanelClass = "flex h-full shrink-0 snap-start flex-col overflow-hidden";

function MobilePickBar({
  state,
  drawerOpen,
  onToggleDrawer,
  onCloseDrawer,
}: {
  state: MobileCaptainState;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onCloseDrawer: () => void;
}) {
  const onClock = state.teams.find((t) => t.id === state.onClockTeamId);
  const nextSlot = state.turnQueue[1];
  const nextTeam = nextSlot ? state.teams.find((t) => t.id === nextSlot.teamId) : null;
  const isMyTurn = state.isCaptainTurn && state.draft.isLive;

  return (
    <>
      {drawerOpen ? (
        <button
          type="button"
          aria-label="Close pick history"
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={onCloseDrawer}
        />
      ) : null}

      <header
        className={`relative sticky top-0 z-50 shrink-0 border-b ${theme.panelDivider} ${
          isMyTurn ? "draft-captain-turn-glow" : theme.panelHeader
        }`}
        style={{
          ["--mobile-pick-bar-height" as string]: PICK_BAR_HEIGHT,
          ...(isMyTurn ? ({ "--captain-turn-color": "#d4af37" } as CSSProperties) : {}),
        }}
      >
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 text-left"
          style={{ minHeight: PICK_BAR_HEIGHT }}
          onClick={onToggleDrawer}
          aria-expanded={drawerOpen}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--draft-text-medium)]">
                Current pick
              </p>
              <PickClock
                isLive={state.draft.isLive}
                startedAt={state.draft.onClockStartedAt}
                className="text-xs"
              />
            </div>
            <p
              className={`truncate text-sm font-semibold ${
                isMyTurn ? "text-amber-200" : ""
              }`}
            >
              {onClock ? onClock.captainName : "Waiting"}
              {!state.draft.isLive ? " · Preview" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-right">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--draft-text-medium)]">
                Next pick
              </p>
              <p className="truncate text-sm font-semibold">
                {nextTeam ? nextTeam.captainName : onClock ? "—" : "—"}
              </p>
            </div>
            <svg
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 text-[var(--draft-text-medium)] transition-transform duration-300 ${
                drawerOpen ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        <div
          className={`absolute left-0 right-0 top-full z-50 overflow-hidden border-b shadow-lg transition-[max-height,opacity] duration-300 ease-out ${theme.card} ${theme.cardBorder} ${
            drawerOpen ? "max-h-[min(50vh,24rem)] opacity-100" : "pointer-events-none max-h-0 opacity-0"
          }`}
        >
          <div className="flex max-h-[min(50vh,24rem)] flex-col">
            <div
              className={`flex shrink-0 items-center justify-between border-b px-4 py-2 ${theme.panelDivider}`}
            >
              <span className="text-sm font-medium">Pick history</span>
              <button
                type="button"
                aria-label="Close"
                className="rounded p-1 text-[var(--draft-text-medium)] hover:bg-[var(--draft-hover)]"
                onClick={onCloseDrawer}
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-2 text-sm">
              {state.pickHistory.length === 0 ? (
                <li className={`py-2 ${theme.cardMeta}`}>No picks yet.</li>
              ) : (
                state.pickHistory.map((entry) => {
                  const team = state.teams.find((t) => t.id === entry.teamId);
                  return (
                    <li
                      key={entry.pickNumber}
                      className={`border-b py-2 last:border-b-0 ${theme.panelDivider}`}
                    >
                      <span className="font-medium" style={{ color: team?.color ?? undefined }}>
                        {entry.captainName}
                      </span>{" "}
                      chose {entry.firstName} {entry.lastName}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </header>
    </>
  );
}

function MobileRosterPlayerRow({
  firstName,
  lastName,
  link,
  rank,
  leaning,
  isStarter = false,
  showRanks,
  ghost = false,
}: {
  firstName: string;
  lastName: string;
  link: string | null;
  rank?: number;
  leaning: string;
  isStarter?: boolean;
  showRanks: boolean;
  ghost?: boolean;
}) {
  const fullName = `${firstName} ${lastName}`;

  return (
    <li
      className={[
        "flex items-center gap-2 border-b py-2 last:border-b-0",
        ghost
          ? "draft-roster-ghost mx-0 my-1.5 rounded-lg border-b-0 px-2"
          : theme.tableRowBorder,
      ].join(" ")}
    >
      <PlayerAvatar link={link} name={fullName} size={MOBILE_ROSTER_AVATAR_SIZE} />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className={[
            "min-w-0 truncate",
            ghost ? "text-[var(--draft-text-medium)]" : "",
          ].join(" ")}
        >
          {fullName}
          {isStarter ? " *" : ""}
        </span>
        {showRanks && rank != null ? (
          <RankGlyph
            rank={rank}
            size={20}
            surface={theme.rankGlyphSurface}
            className="shrink-0"
          />
        ) : null}
      </div>
      <LeaningIcon leaning={leaning} size={14} className="shrink-0" />
    </li>
  );
}

function MobileTeamPanel({
  team,
  minQuotasEnabled,
  maxQuotasEnabled,
  showRanks,
  isOnClock,
  ghostPlayers = [],
}: {
  team: TeamState;
  minQuotasEnabled: boolean;
  maxQuotasEnabled: boolean;
  showRanks: boolean;
  isOnClock: boolean;
  ghostPlayers?: UndraftedPlayer[];
}) {
  return (
    <div
      className={`${carouselPanelClass} mt-2 h-[calc(100%-0.5rem)]`}
      style={{ flex: `0 0 ${CAROUSEL_PANEL_WIDTH}` }}
    >
      <div
        className={[
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-t-4",
          theme.cardBorder,
          isOnClock ? "draft-on-clock-glow" : theme.card,
        ].join(" ")}
        style={{
          borderTopColor: team.color,
          ...(isOnClock ? ({ "--on-clock-color": team.color } as CSSProperties) : {}),
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={`sticky top-0 z-30 border-b px-3 py-2 ${theme.cardBorder} bg-[var(--draft-surface-2)]`}
          >
            <p className="text-base font-semibold leading-snug">
              {team.captainName}
              <span className={`ml-2 text-sm font-normal ${theme.cardMeta}`}>
                {team.roster.length}/{team.targetRosterSize}
              </span>
            </p>
            {areQuotasEnabled({ minQuotasEnabled, maxQuotasEnabled }) ? (
              <div className="mt-1.5">
                <TeamQuotaTable
                  quotaNeed={team.quotaNeed}
                  quotaCap={team.quotaCap}
                  showNeed={minQuotasEnabled}
                  showCap={maxQuotasEnabled}
                  maxQuotasEnabled={maxQuotasEnabled}
                  rankGlyphSize={16}
                  rankGlyphSurface={theme.rankGlyphSurface}
                  labelClassName={theme.cardMeta}
                  headerClassName={theme.cardMeta}
                  cellClassName={`${theme.cardStats} tabular-nums`}
                />
              </div>
            ) : null}
          </div>

          <div className="px-3 pb-4 pt-2">
            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${theme.cardMeta}`}>Roster</p>
            <ul className="space-y-0 text-sm">
              {team.roster.length === 0 ? (
                <li className={theme.cardStatsMuted}>No picks yet.</li>
              ) : (
                team.roster.map((p) => (
                  <MobileRosterPlayerRow
                    key={p.playerId}
                    firstName={p.firstName}
                    lastName={p.lastName}
                    link={p.link}
                    rank={p.rank}
                    leaning={p.leaning}
                    isStarter={p.isStarter}
                    showRanks={showRanks}
                  />
                ))
              )}
              {ghostPlayers.map((player) =>
                player.scores ? (
                  <MobileRosterPlayerRow
                    key={`ghost-${player.playerId}`}
                    firstName={player.firstName}
                    lastName={player.lastName}
                    link={player.link}
                    rank={player.scores.rank}
                    leaning={player.scores.leaning}
                    showRanks={showRanks}
                    ghost
                  />
                ) : null,
              )}
            </ul>
            {team.stats.avgRank != null ? (
              <p className={`mt-4 text-center text-sm tabular-nums ${theme.cardStats}`}>
                Roster average: {team.stats.avgRank.toFixed(2)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileCaptainLayout({
  state,
  showRanks,
  onOpenTeamRef,
  children,
}: {
  state: MobileCaptainState;
  showRanks: boolean;
  onOpenTeamRef?: MutableRefObject<(() => void) | null>;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const wasCaptainTurnRef = useRef(false);

  const myTeamId = state.captainTeamId;
  const myTeam = state.teams.find((t) => t.id === myTeamId);
  const otherTeams = useMemo(
    () => state.teams.filter((t) => t.id !== myTeamId),
    [state.teams, myTeamId],
  );

  const myTeamPanelIndex = 1;
  const captainGhostPlayers = useMemo(() => {
    if (!myTeam) return [];
    return resolveGhostRosterPlayers(
      state.flaggedPlayerIds,
      myTeam.roster.map((player) => player.playerId),
      state.undrafted,
    );
  }, [myTeam, state.flaggedPlayerIds, state.undrafted]);

  const scrollToPanel = useCallback(
    (index: number) => {
      const container = scrollRef.current;
      if (!container) return;
      const panel = container.children[index] as HTMLElement | undefined;
      if (!panel) return;
      container.scrollTo({ left: panel.offsetLeft, behavior: "smooth" });
    },
    [],
  );

  const openMyTeam = useCallback(() => {
    if (myTeam) scrollToPanel(myTeamPanelIndex);
  }, [myTeam, scrollToPanel]);

  useEffect(() => {
    if (onOpenTeamRef) onOpenTeamRef.current = openMyTeam;
    return () => {
      if (onOpenTeamRef) onOpenTeamRef.current = null;
    };
  }, [onOpenTeamRef, openMyTeam]);

  useEffect(() => {
    const canPick = state.isCaptainTurn && state.draft.isLive;
    if (canPick && !wasCaptainTurnRef.current) {
      scrollToPanel(0);
      setDrawerOpen(false);
    }
    wasCaptainTurnRef.current = canPick;
  }, [state.isCaptainTurn, state.draft.isLive, scrollToPanel]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <MobilePickBar
        state={state}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
        onCloseDrawer={() => setDrawerOpen(false)}
      />

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden px-3 scroll-px-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          className={`${carouselPanelClass} overflow-y-auto rounded-lg`}
          style={{ flex: `0 0 ${CAROUSEL_PANEL_WIDTH}` }}
        >
          {children}
        </div>
        {myTeam ? (
          <MobileTeamPanel
            team={myTeam}
            minQuotasEnabled={state.draft.minQuotasEnabled}
            maxQuotasEnabled={state.draft.maxQuotasEnabled}
            showRanks={showRanks}
            isOnClock={myTeam.id === state.onClockTeamId}
            ghostPlayers={captainGhostPlayers}
          />
        ) : null}
        {otherTeams.map((team) => (
          <MobileTeamPanel
            key={team.id}
            team={team}
            minQuotasEnabled={state.draft.minQuotasEnabled}
            maxQuotasEnabled={state.draft.maxQuotasEnabled}
            showRanks={showRanks}
            isOnClock={team.id === state.onClockTeamId}
          />
        ))}
      </div>
    </div>
  );
}

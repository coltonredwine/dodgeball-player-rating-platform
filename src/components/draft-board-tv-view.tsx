"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { LeaningIcon } from "@/components/player-leaning-icon";
import { PlayerAvatar, TeamAvatar } from "@/components/player-avatar";
import { PickClockRing } from "@/components/pick-clock-ring";
import { DefenseStatGlyph, OffenseStatGlyph, PsychStatGlyph } from "@/components/player-stat-glyphs";
import { RankGlyph } from "@/components/rank-glyph";
import { TeamQuotaTable } from "@/components/team-quota-table";
import {
  CaptainBookmarkButton,
  CaptainPlayerPickActions,
  CaptainTradeResponseActions,
  CaptainTradeSwapButton,
  CaptainTradeTargetActions,
} from "@/components/captain-pick-controls";
import { filterPlayersByQuery } from "@/lib/player-search";
import { CaptainPoolSortControl } from "@/components/captain-pool-sort-control";
import { PlayerPoolRankSections } from "@/components/player-pool-rank-sections";
import {
  PendingTradeProposalCard,
  type PendingTradeProposal,
} from "@/components/pending-trade-proposal-card";
import {
  resolveGhostRosterPlayers,
  sortUndraftedWithBookmarks,
} from "@/lib/draft/bookmarks";
import { groupPoolPlayersIntoSections } from "@/lib/draft/pool-sections";
import {
  DEFAULT_CAPTAIN_POOL_SORT,
  sortPoolPlayersByField,
  sortPoolSectionsByField,
  type CaptainPoolSortField,
} from "@/lib/draft/pool-sort";
import { areQuotasEnabled } from "@/lib/draft/quotas";
import { isTradeRosterPlayerInactive } from "@/lib/draft/trade-validation";
import type { QuotaLimits } from "@/lib/draft/quotas";
import type { PublicBoardVisibility } from "@/lib/draft/public-board";
import { RANKS_DESC } from "@/lib/rankings/rank-labels";
import { sortDraftTeams, type DraftTeamSortMode } from "@/lib/draft/team-sort";

const DEFAULT_VISIBILITY: PublicBoardVisibility = {
  showRanks: true,
  showSkillRatings: true,
};

export type CaptainTradeRequestSummary = PendingTradeProposal;

export type CaptainTradeControls = {
  enabled: boolean;
  tradeTargetPlayerId: string | null;
  pendingOfferPlayerId: string | null;
  pendingResponse: { tradeId: string; action: "accept" | "reject" } | null;
  pendingTrades: PendingTradeProposal[];
  offerEligibility: Record<string, boolean>;
  targetEligibility: Record<string, boolean>;
  onSelectTarget: (playerId: string) => void;
  onSelectOffer: (playerId: string) => void;
  onConfirmProposal: () => void;
  onCancelTradeFlow: () => void;
  onBeginResponse: (tradeId: string, action: "accept" | "reject") => void;
  onConfirmResponse: () => void;
  onCancelResponse: () => void;
  onCancelOutgoingTrade: (tradeId: string) => void;
};

export type CaptainTvControls = {
  captainTeamId: string | null;
  flaggedPlayerIds: string[];
  eligibility: Record<string, boolean>;
  isCaptainTurn: boolean;
  showRanksOnCaptainView: boolean;
  pendingPickId: string | null;
  pickError: string | null;
  tradeError: string | null;
  onChoosePlayer: (playerId: string) => void;
  onConfirmPick: () => void;
  onCancelPick: () => void;
  onToggleFlag: (playerId: string) => void;
  trade?: CaptainTradeControls;
};

type PlayerScores = {
  rank: number;
  overall: number;
  leaning: string;
  displayOffensive: number;
  displayDefensive: number;
  displayPsych: number;
};

type TeamState = {
  id: string;
  captainName: string;
  color: string;
  pickOrder: number;
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

type DraftState = {
  draft: {
    name: string;
    isLive: boolean;
    onClockStartedAt: string | null;
    minQuotasEnabled: boolean;
    maxQuotasEnabled: boolean;
    status: string;
    displaySettings: {
      hideRanksOnCompleteTeams: boolean;
      showRanksOnCaptainView?: boolean;
      publicTeamSort?: DraftTeamSortMode;
    };
  };
  currentPickNumber: number;
  picksMade: number;
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
  pendingTrades?: PendingTradeProposal[];
};

type Props = {
  state: DraftState;
  captain?: CaptainTvControls;
  visibility?: PublicBoardVisibility;
  linkPlayerProfiles?: boolean;
  teamSortMode?: DraftTeamSortMode;
};

const TV_PLAYER_AVATAR_SIZE = 36;
const TV_PLAYER_RANK_GLYPH_SIZE = 26;
const TV_PLAYER_STAT_GLYPH_SIZE = 12;
const TV_LEANING_ICON_SIZE = 22;
const TV_LEANING_ICON_SIZE_SM = 18;

function PlayerStatScore({
  glyph,
  value,
}: {
  glyph: ReactNode;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 tabular-nums text-[11px] text-[var(--draft-text-medium)]">
      {glyph}
      {value.toFixed(1)}
    </span>
  );
}

function PlayerPoolCard({
  player,
  captain,
  quotasEnabled,
  canPick,
  suppressRankGlyph = false,
  showRanks = true,
  showSkillRatings = true,
  linkPlayerProfiles = true,
}: {
  player: UndraftedPlayer;
  captain?: CaptainTvControls;
  quotasEnabled: boolean;
  canPick: boolean;
  suppressRankGlyph?: boolean;
  showRanks?: boolean;
  showSkillRatings?: boolean;
  linkPlayerProfiles?: boolean;
}) {
  const scores = player.scores;
  const fullName = `${player.firstName} ${player.lastName}`;
  const eligible = quotasEnabled ? (captain?.eligibility[player.playerId] ?? false) : true;
  const inactive = captain != null && quotasEnabled && !eligible;
  const isPending = captain?.pendingPickId === player.playerId;
  const isSaved = captain?.flaggedPlayerIds.includes(player.playerId) ?? false;
  const savedHighlight = isSaved && !inactive;
  const showRank =
    showRanks && !suppressRankGlyph && (captain ? captain.showRanksOnCaptainView : true);
  const showChoose = captain != null && eligible;

  const showPickActions = captain != null && showChoose;

  return (
    <div
      className={[
        "draft-tv-player-card relative flex items-start gap-2 px-3 py-2.5 sm:gap-3",
        inactive ? "draft-player-inactive" : "",
        isPending ? "bg-green-950/30 ring-1 ring-inset ring-green-700/60" : "",
        savedHighlight && !isPending ? "draft-captain-saved-player" : "",
      ].join(" ")}
    >
      {captain ? (
        <CaptainBookmarkButton
          active={isSaved}
          onClick={() => captain.onToggleFlag(player.playerId)}
        />
      ) : null}
      <PlayerAvatar
        playerId={player.playerId}
        link={player.link}
        name={fullName}
        size={TV_PLAYER_AVATAR_SIZE}
        linkToProfile={linkPlayerProfiles}
      />
      <div
        className={[
          "flex min-w-0 flex-1 flex-col",
          showPickActions ? (isPending ? "pr-[4.25rem]" : "pr-9") : "",
        ].join(" ")}
      >
        <p className="truncate text-sm font-medium leading-tight text-[var(--draft-text-high)]">
          {fullName}
        </p>
        {scores ? (
          <div className="mt-0.5 flex min-w-0 items-start gap-x-2">
            {showRank ? (
              <RankGlyph
                rank={scores.rank}
                size={TV_PLAYER_RANK_GLYPH_SIZE}
                surface="dark"
                className="draft-tv-rank-glyph shrink-0"
              />
            ) : null}
            {showSkillRatings ? (
              <div className="flex min-w-0 flex-1 items-center justify-start gap-x-2">
                <PlayerStatScore
                  glyph={<OffenseStatGlyph size={TV_PLAYER_STAT_GLYPH_SIZE} />}
                  value={scores.displayOffensive}
                />
                <PlayerStatScore
                  glyph={<DefenseStatGlyph size={TV_PLAYER_STAT_GLYPH_SIZE} />}
                  value={scores.displayDefensive}
                />
                <PlayerStatScore
                  glyph={<PsychStatGlyph size={TV_PLAYER_STAT_GLYPH_SIZE} />}
                  value={scores.displayPsych}
                />
              </div>
            ) : null}
            {!showPickActions ? (
              <LeaningIcon
                leaning={scores.leaning}
                size={TV_LEANING_ICON_SIZE}
                monochrome
                className="shrink-0"
              />
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-[var(--draft-text-disabled)]">—</p>
        )}
      </div>
      {scores && showPickActions ? (
        <div className="absolute bottom-2.5 right-3 top-2.5 flex flex-col items-center justify-between">
          <LeaningIcon
            leaning={scores.leaning}
            size={TV_LEANING_ICON_SIZE}
            monochrome
            className="shrink-0"
          />
          <CaptainPlayerPickActions
            playerId={player.playerId}
            showChoose={showChoose}
            chooseDisabled={!canPick}
            isPending={isPending}
            onChoose={captain.onChoosePlayer}
            onConfirm={captain.onConfirmPick}
            onCancel={captain.onCancelPick}
          />
        </div>
      ) : null}
    </div>
  );
}

function GhostRosterSlot({
  player,
  showRank,
  linkPlayerProfiles = true,
}: {
  player: UndraftedPlayer;
  showRank: boolean;
  linkPlayerProfiles?: boolean;
}) {
  const scores = player.scores;
  const fullName = `${player.firstName} ${player.lastName}`;

  return (
    <div className="draft-tv-roster-slot draft-roster-ghost flex items-center gap-2 px-2 py-2">
      <PlayerAvatar
        playerId={player.playerId}
        link={player.link}
        name={fullName}
        size={TV_PLAYER_AVATAR_SIZE}
        linkToProfile={linkPlayerProfiles}
      />
      <div
        className="flex min-w-0 flex-1 flex-col"
        style={{ minHeight: TV_PLAYER_AVATAR_SIZE }}
      >
        <p className="truncate text-sm font-medium leading-tight text-[var(--draft-text-medium)]">
          {fullName}
        </p>
        {scores && showRank ? (
          <div className="flex flex-1 items-center">
            <RankGlyph
              rank={scores.rank}
              size={TV_PLAYER_RANK_GLYPH_SIZE}
              surface="dark"
              className="draft-tv-rank-glyph"
            />
          </div>
        ) : null}
      </div>
      {scores ? (
        <LeaningIcon
          leaning={scores.leaning}
          size={TV_LEANING_ICON_SIZE_SM}
          monochrome
          className="self-center"
        />
      ) : null}
    </div>
  );
}

function RosterSlot({
  player,
  showRank,
  linkPlayerProfiles = true,
  tradeActions,
  highlighted = false,
  inactive = false,
}: {
  player?: TeamState["roster"][number];
  showRank: boolean;
  linkPlayerProfiles?: boolean;
  tradeActions?: ReactNode;
  highlighted?: boolean;
  inactive?: boolean;
}) {
  if (!player) {
    return (
      <div className="draft-tv-roster-slot flex items-center gap-2 px-2 py-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--draft-divider)] text-[var(--draft-text-disabled)]">
          +
        </span>
        <span className="text-sm text-[var(--draft-text-disabled)]">Open slot</span>
      </div>
    );
  }

  const fullName = `${player.firstName} ${player.lastName}`;

  return (
    <div
      className={[
        "draft-tv-roster-slot flex items-center gap-2 px-2 py-2",
        inactive ? "draft-player-inactive" : "",
        highlighted ? "rounded-md bg-sky-950/30 ring-1 ring-sky-700/60" : "",
      ].join(" ")}
    >
      <PlayerAvatar
        playerId={player.playerId}
        link={player.link}
        name={fullName}
        size={TV_PLAYER_AVATAR_SIZE}
        linkToProfile={linkPlayerProfiles}
      />
      <div
        className="flex min-w-0 flex-1 flex-col"
        style={{ minHeight: TV_PLAYER_AVATAR_SIZE }}
      >
        <p className="truncate text-sm font-medium leading-tight text-[var(--draft-text-high)]">
          {fullName}
          {player.isStarter ? " *" : ""}
        </p>
        {showRank ? (
          <div className="flex flex-1 items-center">
            <RankGlyph
              rank={player.rank}
              size={TV_PLAYER_RANK_GLYPH_SIZE}
              surface="dark"
              className="draft-tv-rank-glyph"
            />
          </div>
        ) : null}
      </div>
      <LeaningIcon
        leaning={player.leaning}
        size={TV_LEANING_ICON_SIZE_SM}
        monochrome
        className="self-center"
      />
      {tradeActions}
    </div>
  );
}

function TeamCard({
  team,
  isOnClock,
  isCaptainTeam,
  showQuotas,
  minQuotasEnabled,
  maxQuotasEnabled,
  hideRanks,
  showSkillRatings = true,
  linkPlayerProfiles = true,
  ghostPlayers = [],
  trade,
  captainTeamId,
  teamPendingTrades = [],
}: {
  team: TeamState;
  isOnClock: boolean;
  isCaptainTeam: boolean;
  showQuotas: boolean;
  minQuotasEnabled: boolean;
  maxQuotasEnabled: boolean;
  hideRanks: boolean;
  showSkillRatings?: boolean;
  linkPlayerProfiles?: boolean;
  ghostPlayers?: UndraftedPlayer[];
  trade?: CaptainTradeControls;
  captainTeamId?: string | null;
  teamPendingTrades?: PendingTradeProposal[];
}) {
  const emptySlots = Math.max(0, team.targetRosterSize - team.roster.length);
  const incomingTrades =
    trade?.pendingTrades.filter((entry) => entry.counterpartyTeamId === team.id) ?? [];
  const outgoingTrades =
    trade?.pendingTrades.filter((entry) => entry.proposingTeamId === team.id) ?? [];
  const hasOutgoingPending = outgoingTrades.length > 0;
  const quotasEnabled = areQuotasEnabled({ minQuotasEnabled, maxQuotasEnabled });

  function tradeRosterInactive(player: TeamState["roster"][number]) {
    if (!trade?.enabled) return false;
    return isTradeRosterPlayerInactive({
      tradeEnabled: trade.enabled,
      quotasEnabled,
      isStarter: player.isStarter,
      playerId: player.playerId,
      isCaptainTeam: !!isCaptainTeam,
      hasOutgoingPending,
      tradeTargetPlayerId: trade.tradeTargetPlayerId,
      offerEligibility: trade.offerEligibility,
      targetEligibility: trade.targetEligibility,
    });
  }

  function renderRosterTradeActions(player: TeamState["roster"][number]) {
    if (!trade?.enabled || !captainTeamId) return null;
    if (player.isStarter) return null;

    const incomingTrade = incomingTrades.find(
      (entry) => entry.requestedPlayerId === player.playerId,
    );
    if (incomingTrade && isCaptainTeam) {
      const pendingAccept =
        trade.pendingResponse?.tradeId === incomingTrade.id &&
        trade.pendingResponse.action === "accept";
      const pendingReject =
        trade.pendingResponse?.tradeId === incomingTrade.id &&
        trade.pendingResponse.action === "reject";

      return (
        <CaptainTradeResponseActions
          isPendingAccept={pendingAccept}
          isPendingReject={pendingReject}
          onAccept={() => trade.onBeginResponse(incomingTrade.id, "accept")}
          onReject={() => trade.onBeginResponse(incomingTrade.id, "reject")}
          onConfirm={trade.onConfirmResponse}
          onCancel={trade.onCancelResponse}
        />
      );
    }

    if (isCaptainTeam) {
      const eligible = trade.offerEligibility[player.playerId] === true;
      const isPendingOffer = trade.pendingOfferPlayerId === player.playerId;
      const showOfferButton = trade.tradeTargetPlayerId != null && eligible && !hasOutgoingPending;

      if (!showOfferButton && !isPendingOffer) return null;

      return (
        <CaptainTradeSwapButton
          disabled={!eligible}
          isPending={isPendingOffer}
          onClick={() => trade.onSelectOffer(player.playerId)}
          onConfirm={trade.onConfirmProposal}
          onCancel={trade.onCancelTradeFlow}
        />
      );
    }

    if (team.id === captainTeamId || hasOutgoingPending) return null;

    if (trade.tradeTargetPlayerId === player.playerId) {
      return <CaptainTradeTargetActions onCancel={trade.onCancelTradeFlow} />;
    }

    if (trade.tradeTargetPlayerId != null) return null;

    if (trade.targetEligibility[player.playerId] !== true) return null;

    return (
      <CaptainTradeSwapButton
        onClick={() => trade.onSelectTarget(player.playerId)}
        onConfirm={() => undefined}
        onCancel={trade.onCancelTradeFlow}
      />
    );
  }

  return (
    <article
      className={[
        "draft-tv-team-card flex min-h-0 min-w-[220px] flex-1 flex-col overflow-hidden",
        isOnClock ? "draft-on-clock-glow" : "",
        isCaptainTeam ? "draft-tv-team-card--captain" : "",
      ].join(" ")}
      style={
        {
          "--team-color": team.color,
          ...(isOnClock ? { "--on-clock-color": team.color } : {}),
        } as CSSProperties
      }
    >
      <header className="draft-tv-team-card__header border-b border-[var(--draft-divider)] px-3 py-3">
        <div className="flex items-center gap-3">
          <TeamAvatar name={team.captainName} color={team.color} size={44} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold uppercase tracking-wide text-[var(--draft-text-high)]">
              {team.captainName}
            </h3>
          </div>
        </div>

        {showQuotas ? (
          <div className="mt-2 border-t border-[var(--draft-divider)] pt-2">
            <TeamQuotaTable
              quotaNeed={team.quotaNeed}
              quotaCap={team.quotaCap}
              showNeed={minQuotasEnabled}
              showCap={maxQuotasEnabled}
              maxQuotasEnabled={maxQuotasEnabled}
              rankGlyphSize={24}
              rankGlyphSurface="dark"
              className="text-sm"
              labelClassName="text-sm font-semibold text-[var(--draft-text-medium)]"
              cellClassName="tabular-nums text-sm font-medium text-[var(--draft-text-high)]"
            />
          </div>
        ) : null}

        {trade?.enabled && isCaptainTeam && outgoingTrades.length > 0 ? (
          <div className="mt-2 space-y-2">
            {outgoingTrades.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-amber-800/70 bg-amber-950/40 px-2.5 py-2 text-xs text-amber-100"
              >
                Trade proposal sent. Waiting for {entry.counterpartyCaptainName}&apos;s response.
                <button
                  type="button"
                  className="ml-2 underline hover:text-white"
                  onClick={() => trade.onCancelOutgoingTrade(entry.id)}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {trade?.enabled && isCaptainTeam && trade.tradeTargetPlayerId ? (
          <div className="mt-2 rounded-lg border border-sky-800/70 bg-sky-950/30 px-2.5 py-2 text-xs text-sky-100">
            Choose one of your players to offer in the swap.
            <button
              type="button"
              className="ml-2 underline hover:text-white"
              onClick={trade.onCancelTradeFlow}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        <p className="px-2 pb-1.5 pt-1 text-sm font-semibold text-[var(--draft-text-high)]">
          Roster ({team.roster.length}/{team.targetRosterSize})
        </p>
        {teamPendingTrades.length > 0 ? (
          <div className="space-y-2 px-1 pb-2">
            {teamPendingTrades.map((entry) => {
              const incomingTrade =
                trade?.enabled && isCaptainTeam
                  ? incomingTrades.find((tradeEntry) => tradeEntry.id === entry.id)
                  : undefined;

              return (
                <PendingTradeProposalCard
                  key={entry.id}
                  trade={entry}
                  linkPlayerProfiles={linkPlayerProfiles}
                  approveActions={
                    trade?.enabled && isCaptainTeam && incomingTrade
                      ? {
                          isPending:
                            trade.pendingResponse?.tradeId === entry.id &&
                            trade.pendingResponse.action === "accept",
                          onBegin: () => trade.onBeginResponse(entry.id, "accept"),
                          onConfirm: trade.onConfirmResponse,
                          onCancel: trade.onCancelResponse,
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        ) : null}
        {team.roster.map((player) => (
          <RosterSlot
            key={player.playerId}
            player={player}
            showRank={!hideRanks}
            linkPlayerProfiles={linkPlayerProfiles}
            tradeActions={renderRosterTradeActions(player)}
            inactive={tradeRosterInactive(player)}
            highlighted={
              !tradeRosterInactive(player) &&
              (trade?.tradeTargetPlayerId === player.playerId ||
                trade?.pendingOfferPlayerId === player.playerId)
            }
          />
        ))}
        {isCaptainTeam
          ? ghostPlayers.map((player) => (
              <GhostRosterSlot
                key={`ghost-${player.playerId}`}
                player={player}
                showRank={!hideRanks}
                linkPlayerProfiles={linkPlayerProfiles}
              />
            ))
          : null}
        {Array.from({ length: emptySlots }, (_, index) => (
          <RosterSlot key={`empty-${index}`} showRank={!hideRanks} linkPlayerProfiles={linkPlayerProfiles} />
        ))}
      </div>

      <footer className="draft-tv-team-card__footer border-t border-[var(--draft-divider)] px-3 py-2.5 text-center text-sm text-[var(--draft-text-medium)]">
        {!hideRanks ? (
          <p className="text-base font-medium tabular-nums text-[var(--draft-text-high)]">
            Roster average: {team.stats.avgRank != null ? team.stats.avgRank.toFixed(2) : "—"}
          </p>
        ) : null}
        {showSkillRatings ? (
          <div
            className={[
              "flex items-center justify-center gap-3 text-sm tabular-nums",
              hideRanks ? "" : "mt-1.5",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-1">
              {team.stats.offensiveCount}
              <LeaningIcon leaning="offensive" size={TV_LEANING_ICON_SIZE_SM} monochrome />
              {team.stats.avgOffensive != null ? team.stats.avgOffensive.toFixed(2) : "—"}
            </span>
            <span className="text-[var(--draft-text-disabled)]">|</span>
            <span className="inline-flex items-center gap-1">
              {team.stats.defensiveCount}
              <LeaningIcon leaning="defensive" size={TV_LEANING_ICON_SIZE_SM} monochrome />
              {team.stats.avgDefensive != null ? team.stats.avgDefensive.toFixed(2) : "—"}
            </span>
          </div>
        ) : null}
      </footer>
    </article>
  );
}

export function DraftBoardTvView({
  state,
  captain,
  visibility = DEFAULT_VISIBILITY,
  linkPlayerProfiles = true,
  teamSortMode = "pickOrder",
}: Props) {
  const [search, setSearch] = useState("");
  const [poolSort, setPoolSort] = useState<CaptainPoolSortField>(DEFAULT_CAPTAIN_POOL_SORT);
  const isCaptainView = captain != null;
  const showRanks = visibility.showRanks;
  const showSkillRatings = visibility.showSkillRatings;
  const onClockTeam = state.teams.find((team) => team.id === state.onClockTeamId);
  const showQuotas = areQuotasEnabled(state.draft) && showRanks;
  const canPick = Boolean(captain?.isCaptainTurn && state.draft.isLive);
  const poolPlayers = useMemo(() => {
    let players = state.undrafted;
    if (isCaptainView && captain) {
      players = sortUndraftedWithBookmarks(players, captain.flaggedPlayerIds);
    }
    if (isCaptainView) {
      players = filterPlayersByQuery(players, search);
    }
    return players;
  }, [captain, isCaptainView, search, state.undrafted]);

  const poolSections = useMemo(() => {
    if (!showRanks) return null;

    const sections = groupPoolPlayersIntoSections(poolPlayers, {
      bookmarkIds: isCaptainView && captain ? captain.flaggedPlayerIds : undefined,
    });

    return isCaptainView ? sortPoolSectionsByField(sections, poolSort) : sections;
  }, [captain, isCaptainView, poolPlayers, poolSort, showRanks]);

  const sortedFlatPoolPlayers = useMemo(
    () => (isCaptainView ? sortPoolPlayersByField(poolPlayers, poolSort) : poolPlayers),
    [isCaptainView, poolPlayers, poolSort],
  );

  const captainGhostPlayers = useMemo(() => {
    if (!captain?.captainTeamId) return [];
    const team = state.teams.find((entry) => entry.id === captain.captainTeamId);
    if (!team) return [];
    return resolveGhostRosterPlayers(
      captain.flaggedPlayerIds,
      team.roster.map((player) => player.playerId),
      state.undrafted,
    );
  }, [captain, state.teams, state.undrafted]);

  const pendingTrades = state.pendingTrades ?? captain?.trade?.pendingTrades ?? [];

  const effectiveTeamSort: DraftTeamSortMode =
    teamSortMode === "avgRank" && showRanks ? "avgRank" : "pickOrder";

  const displayTeams = useMemo(
    () => sortDraftTeams(state.teams, effectiveTeamSort),
    [state.teams, effectiveTeamSort],
  );

  const upcomingQueue = state.turnQueue.slice(1);
  const lastPick = state.pickHistory.at(-1) ?? null;
  const lastPickTeam = lastPick
    ? state.teams.find((team) => team.id === lastPick.teamId)
    : null;

  return (
    <div className="draft-tv grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)_minmax(260px,320px)] lg:gap-4">
        <aside className="draft-tv-sidebar flex min-h-0 flex-col gap-4 overflow-hidden rounded-xl border border-[var(--draft-divider)] bg-[var(--draft-surface-2)] p-3">
          {onClockTeam ? (
            <div
              className="draft-tv-picking-now rounded-lg border border-[var(--draft-accent)] bg-[var(--draft-surface-3)] p-3"
              style={{ borderLeftWidth: 4, borderLeftColor: onClockTeam.color }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--draft-accent)]">
                Picking now
              </p>
              <div className="mt-2 flex items-center gap-2">
                <TeamAvatar name={onClockTeam.captainName} color={onClockTeam.color} size={36} />
                <p className="text-sm font-semibold text-[var(--draft-text-high)]">{onClockTeam.captainName}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--draft-text-medium)]">
              {state.draft.status === "complete" ? "Draft complete." : "Waiting for next pick."}
            </p>
          )}

          <PickClockRing isLive={state.draft.isLive} startedAt={state.draft.onClockStartedAt} />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--draft-text-medium)]">
              Up next
            </p>
            <ul className="space-y-2">
              {upcomingQueue.length === 0 ? (
                <li className="text-sm text-[var(--draft-text-disabled)]">No upcoming picks.</li>
              ) : (
                upcomingQueue.map((slot) => {
                  const team = state.teams.find((entry) => entry.id === slot.teamId);
                  return (
                    <li
                      key={slot.pickNumber}
                      className="flex items-center gap-2 rounded-lg border border-[var(--draft-divider)] bg-[var(--draft-surface-1)] px-2 py-2"
                    >
                      <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-[var(--draft-text-medium)]">
                        {slot.pickNumber}
                      </span>
                      {team ? (
                        <TeamAvatar name={team.captainName} color={team.color} size={28} />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[var(--draft-text-high)]">{team?.captainName ?? "—"}</p>
                        <p className="text-[10px] uppercase tracking-wide text-[var(--draft-text-disabled)]">
                          Round {slot.round}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div className="shrink-0 border-t border-[var(--draft-divider)] pt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--draft-text-medium)]">
              Last action
            </p>
            {lastPick ? (
              <p className="text-sm leading-snug text-[var(--draft-text-high)]">
                <span className="font-medium" style={{ color: lastPickTeam?.color }}>
                  {lastPick.captainName}
                </span>{" "}
                picked{" "}
                <span className="font-medium">
                  {lastPick.firstName} {lastPick.lastName}
                </span>
              </p>
            ) : (
              <p className="text-sm text-[var(--draft-text-disabled)]">No picks yet.</p>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden">
          <header className="shrink-0 pb-3 text-center">
            <h1 className="draft-tv-title text-2xl font-bold uppercase tracking-[0.12em] text-[var(--draft-text-high)] sm:text-3xl">
              {state.draft.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-3">
              {!state.draft.isLive ? (
                <span className="rounded-full bg-amber-950/70 px-2.5 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-800/70">
                  Not live
                </span>
              ) : (
                <span className="rounded-full bg-green-950/70 px-2.5 py-0.5 text-xs font-medium text-green-300 ring-1 ring-green-800/70">
                  Live
                </span>
              )}
              <span className="text-sm text-[var(--draft-text-medium)]">
                Pick {Math.min(state.picksMade + (state.onClockTeamId ? 1 : 0), state.totalPicks)} / {state.totalPicks}
              </span>
            </div>
          </header>
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
            {displayTeams.map((team) => {
              const hideRanks =
                !showRanks ||
                (state.draft.displaySettings.hideRanksOnCompleteTeams && team.remainingPicks <= 0);
              return (
                <TeamCard
                  key={team.id}
                  team={team}
                  isOnClock={team.id === state.onClockTeamId}
                  isCaptainTeam={captain != null && team.id === captain.captainTeamId}
                  showQuotas={showQuotas}
                  minQuotasEnabled={state.draft.minQuotasEnabled}
                  maxQuotasEnabled={state.draft.maxQuotasEnabled}
                  hideRanks={hideRanks}
                  showSkillRatings={showSkillRatings}
                  linkPlayerProfiles={linkPlayerProfiles}
                  captainTeamId={captain?.captainTeamId}
                  trade={captain?.trade}
                  teamPendingTrades={pendingTrades.filter(
                    (entry) => entry.counterpartyTeamId === team.id,
                  )}
                  ghostPlayers={
                    captain != null && team.id === captain.captainTeamId
                      ? captainGhostPlayers
                      : undefined
                  }
                />
              );
            })}
          </div>
        </section>

        <aside className="draft-tv-pool flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--draft-divider)] bg-[var(--draft-surface-2)]">
          <div className="border-b border-[var(--draft-divider)] p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--draft-text-medium)]">
              Players ({state.undraftedTotal})
            </p>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {showRanks
                ? RANKS_DESC.map((rank) => {
                    const count = state.undraftedRankCounts[rank] ?? 0;
                    const inactive = count === 0;
                    return (
                      <span
                        key={rank}
                        className={[
                          "inline-flex items-center gap-1.5 tabular-nums text-base font-semibold",
                          inactive
                            ? "quota-column-inactive text-[var(--draft-text-disabled)]"
                            : "text-[var(--draft-text-high)]",
                        ].join(" ")}
                      >
                        <RankGlyph
                          rank={rank}
                          size={22}
                          surface="dark"
                          className={inactive ? "quota-rank-glyph-inactive" : "draft-tv-rank-glyph"}
                        />
                        {count}
                      </span>
                    );
                  })
                : null}
            </div>
            {canPick ? (
              <p className="mt-2 rounded-lg bg-green-950/80 px-3 py-2 text-center text-xs font-medium text-green-300 ring-1 ring-green-800/80">
                Your pick — choose a player
              </p>
            ) : null}
            {isCaptainView ? (
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search players…"
                className="mt-2 w-full rounded-lg border border-[var(--draft-divider)] bg-[var(--draft-surface-1)] px-3 py-2 text-sm text-[var(--draft-text-high)] placeholder:text-[var(--draft-text-disabled)]"
              />
            ) : null}
            {isCaptainView && poolPlayers.length > 0 ? (
              <CaptainPoolSortControl
                value={poolSort}
                onChange={setPoolSort}
                className="mt-2.5"
              />
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {poolPlayers.length === 0 ? (
              <p className="p-4 text-sm text-[var(--draft-text-disabled)]">
                {isCaptainView && search ? "No matching players." : "No players available."}
              </p>
            ) : showRanks && poolSections ? (
              <PlayerPoolRankSections
                sections={poolSections}
                renderPlayer={(player, section) => (
                  <PlayerPoolCard
                    key={player.playerId}
                    player={player}
                    captain={captain}
                    quotasEnabled={showQuotas}
                    canPick={canPick}
                    suppressRankGlyph={section.kind === "rank"}
                    showRanks={showRanks}
                    showSkillRatings={showSkillRatings}
                    linkPlayerProfiles={linkPlayerProfiles}
                  />
                )}
              />
            ) : (
              sortedFlatPoolPlayers.map((player) => (
                <PlayerPoolCard
                  key={player.playerId}
                  player={player}
                  captain={captain}
                  quotasEnabled={showQuotas}
                  canPick={canPick}
                  showRanks={showRanks}
                  showSkillRatings={showSkillRatings}
                  linkPlayerProfiles={linkPlayerProfiles}
                />
              ))
            )}
          </div>
          {captain?.pickError || captain?.tradeError ? (
            <p className="border-t border-[var(--draft-divider)] p-3 text-sm text-red-400">
              {captain.pickError ?? captain.tradeError}
            </p>
          ) : null}
        </aside>
    </div>
  );
}

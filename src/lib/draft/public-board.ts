import type { DraftDisplaySettings } from "./constants";
import type { DraftState } from "./service";
import type { TradeRequestSummary } from "./trades";

export type PublicBoardVisibility = {
  showRanks: boolean;
  showSkillRatings: boolean;
};

export function publicBoardVisibility(
  settings: Pick<DraftDisplaySettings, "publicShowRanks" | "publicShowSkillRatings"> & {
    playerRanksEnabled?: boolean;
  },
): PublicBoardVisibility {
  return {
    showRanks: (settings.playerRanksEnabled ?? true) && settings.publicShowRanks,
    showSkillRatings: settings.publicShowSkillRatings,
  };
}

const EMPTY_RANK_COUNTS: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

function emptyQuotaRecord(): Record<number, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

/** Strip rank and skill fields from draft state for anonymous viewers. */
export function redactPublicDraftState(
  state: DraftState,
  settings: DraftDisplaySettings,
): DraftState {
  const playerRanksEnabled = settings.playerRanksEnabled ?? true;
  const showRanks = playerRanksEnabled && settings.publicShowRanks;
  const showSkills = settings.publicShowSkillRatings;
  const showRally =
    settings.showRallyOnPool === true || settings.showRallyOnRoster === true;
  // Keep overall when skills or RAL display needs it.
  const keepOverall = showSkills || showRally;

  if (showRanks && showSkills && !showRally) {
    return state;
  }

  const redactScores = <T extends {
    rank: number;
    overall: number;
    displayOffensive: number;
    displayDefensive: number;
    displayPsych: number;
    metrics: Record<string, number>;
  }>(
    scores: T,
  ): T => ({
    ...scores,
    rank: showRanks ? scores.rank : 0,
    overall: keepOverall ? scores.overall : 0,
    displayOffensive: showSkills ? scores.displayOffensive : 0,
    displayDefensive: showSkills ? scores.displayDefensive : 0,
    displayPsych: showSkills ? scores.displayPsych : 0,
    metrics: showSkills ? scores.metrics : {},
  });

  return {
    ...state,
    undraftedRankCounts: showRanks ? state.undraftedRankCounts : { ...EMPTY_RANK_COUNTS },
    rankPoolCounts: showRanks ? state.rankPoolCounts : { ...EMPTY_RANK_COUNTS },
    quotas: showRanks ? state.quotas : {},
    undrafted: state.undrafted.map((player) => ({
      ...player,
      scores: redactScores(player.scores),
    })),
    drafted: state.drafted.map((player) => ({
      ...player,
      scores: redactScores(player.scores),
    })),
    teams: state.teams.map((team) => ({
      ...team,
      roster: team.roster.map((entry) => ({
        ...entry,
        rank: showRanks ? entry.rank : 0,
        overall: keepOverall ? entry.overall : 0,
        displayOffensive: showSkills ? entry.displayOffensive : 0,
        displayDefensive: showSkills ? entry.displayDefensive : 0,
        displayPsych: showSkills ? entry.displayPsych : 0,
      })),
      rankCounts: showRanks ? team.rankCounts : { ...EMPTY_RANK_COUNTS },
      quotaNeed: showRanks ? team.quotaNeed : emptyQuotaRecord(),
      quotaCap: showRanks ? team.quotaCap : emptyQuotaRecord(),
      stats: {
        ...team.stats,
        avgRank: showRanks ? team.stats.avgRank : null,
        avgOverall: keepOverall ? team.stats.avgOverall : null,
        avgOffensive: showSkills ? team.stats.avgOffensive : null,
        avgDefensive: showSkills ? team.stats.avgDefensive : null,
        offensiveCount: showSkills ? team.stats.offensiveCount : 0,
        defensiveCount: showSkills ? team.stats.defensiveCount : 0,
      },
    })),
  } as DraftState;
}

export function redactPendingTrades(
  trades: TradeRequestSummary[],
  settings: Pick<DraftDisplaySettings, "publicShowRanks" | "playerRanksEnabled">,
): TradeRequestSummary[] {
  const showRanks =
    (settings.playerRanksEnabled ?? true) && settings.publicShowRanks;
  if (showRanks) return trades;

  return trades.map((trade) => ({
    ...trade,
    offeredPlayer: { ...trade.offeredPlayer, rank: 0 },
    requestedPlayer: { ...trade.requestedPlayer, rank: 0 },
  }));
}

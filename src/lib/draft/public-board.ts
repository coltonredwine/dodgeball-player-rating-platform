import type { DraftDisplaySettings } from "./constants";
import type { DraftState } from "./service";
import type { TradeRequestSummary } from "./trades";

export type PublicBoardVisibility = {
  showRanks: boolean;
  showSkillRatings: boolean;
};

export function publicBoardVisibility(
  settings: Pick<DraftDisplaySettings, "publicShowRanks" | "publicShowSkillRatings">,
): PublicBoardVisibility {
  return {
    showRanks: settings.publicShowRanks,
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
  if (settings.publicShowRanks && settings.publicShowSkillRatings) {
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
    rank: settings.publicShowRanks ? scores.rank : 0,
    overall: settings.publicShowSkillRatings ? scores.overall : 0,
    displayOffensive: settings.publicShowSkillRatings ? scores.displayOffensive : 0,
    displayDefensive: settings.publicShowSkillRatings ? scores.displayDefensive : 0,
    displayPsych: settings.publicShowSkillRatings ? scores.displayPsych : 0,
    metrics: settings.publicShowSkillRatings ? scores.metrics : {},
  });

  return {
    ...state,
    undraftedRankCounts: settings.publicShowRanks
      ? state.undraftedRankCounts
      : { ...EMPTY_RANK_COUNTS },
    rankPoolCounts: settings.publicShowRanks ? state.rankPoolCounts : { ...EMPTY_RANK_COUNTS },
    quotas: settings.publicShowRanks ? state.quotas : {},
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
        rank: settings.publicShowRanks ? entry.rank : 0,
        overall: entry.overall,
        displayOffensive: settings.publicShowSkillRatings ? entry.displayOffensive : 0,
        displayDefensive: settings.publicShowSkillRatings ? entry.displayDefensive : 0,
        displayPsych: settings.publicShowSkillRatings ? entry.displayPsych : 0,
      })),
      rankCounts: settings.publicShowRanks ? team.rankCounts : { ...EMPTY_RANK_COUNTS },
      quotaNeed: settings.publicShowRanks ? team.quotaNeed : emptyQuotaRecord(),
      quotaCap: settings.publicShowRanks ? team.quotaCap : emptyQuotaRecord(),
      stats: {
        ...team.stats,
        avgRank: settings.publicShowRanks ? team.stats.avgRank : null,
        avgOffensive: settings.publicShowSkillRatings ? team.stats.avgOffensive : null,
        avgDefensive: settings.publicShowSkillRatings ? team.stats.avgDefensive : null,
        offensiveCount: settings.publicShowSkillRatings ? team.stats.offensiveCount : 0,
        defensiveCount: settings.publicShowSkillRatings ? team.stats.defensiveCount : 0,
      },
    })),
  } as DraftState;
}

export function redactPendingTrades(
  trades: TradeRequestSummary[],
  settings: Pick<DraftDisplaySettings, "publicShowRanks">,
): TradeRequestSummary[] {
  if (settings.publicShowRanks) return trades;

  return trades.map((trade) => ({
    ...trade,
    offeredPlayer: { ...trade.offeredPlayer, rank: 0 },
    requestedPlayer: { ...trade.requestedPlayer, rank: 0 },
  }));
}

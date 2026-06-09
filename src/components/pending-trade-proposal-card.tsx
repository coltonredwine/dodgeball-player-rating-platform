import type { ReactNode } from "react";
import { CaptainTradeProposalApproveButton, TradeSwapIcon } from "@/components/captain-pick-controls";
import { PlayerAvatar } from "@/components/player-avatar";
import { RankGlyph } from "@/components/rank-glyph";

export type PendingTradeProposal = {
  id: string;
  proposingTeamId: string;
  counterpartyTeamId: string;
  proposingTeamColor: string;
  proposingCaptainName: string;
  counterpartyCaptainName: string;
  offeredPlayerId: string;
  requestedPlayerId: string;
  offeredPlayer: {
    playerId: string;
    firstName: string;
    lastName: string;
    rank: number;
    link: string | null;
  };
  requestedPlayer: {
    playerId: string;
    firstName: string;
    lastName: string;
    rank: number;
    link: string | null;
  };
};

function TradePlayerSide({
  player,
  linkPlayerProfiles,
  avatarSize,
  rankGlyphSize,
}: {
  player: PendingTradeProposal["offeredPlayer"];
  linkPlayerProfiles: boolean;
  avatarSize: number;
  rankGlyphSize: number;
}) {
  const fullName = `${player.firstName} ${player.lastName}`;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
      <PlayerAvatar
        playerId={player.playerId}
        link={player.link}
        name={fullName}
        size={avatarSize}
        linkToProfile={linkPlayerProfiles}
      />
      <div className="flex w-full min-w-0 items-center justify-center gap-1.5">
        {player.rank > 0 ? (
          <RankGlyph
            rank={player.rank}
            size={rankGlyphSize}
            surface="dark"
            className="draft-tv-rank-glyph shrink-0"
          />
        ) : null}
        <p className="min-w-0 truncate text-xs font-medium leading-tight text-[var(--draft-text-high)]">
          {fullName}
        </p>
      </div>
    </div>
  );
}

type Props = {
  trade: PendingTradeProposal;
  linkPlayerProfiles?: boolean;
  compact?: boolean;
  footer?: ReactNode;
  approveActions?: {
    isPending: boolean;
    onBegin: () => void;
    onConfirm: () => void;
    onCancel: () => void;
  };
};

export function PendingTradeProposalCard({
  trade,
  linkPlayerProfiles = true,
  compact = false,
  footer,
  approveActions,
}: Props) {
  const avatarSize = compact ? 32 : 36;
  const rankGlyphSize = compact ? 18 : 20;
  const color = trade.proposingTeamColor;

  return (
    <div
      className="draft-pending-trade-card overflow-hidden rounded-lg border"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}14`,
        boxShadow: `inset 4px 0 0 ${color}`,
      }}
    >
      <div className="px-2.5 py-2">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--draft-text-medium)]">
          Trade proposed by {trade.proposingCaptainName}
        </p>
        <div className="flex items-center gap-2">
          <TradePlayerSide
            player={trade.requestedPlayer}
            linkPlayerProfiles={linkPlayerProfiles}
            avatarSize={avatarSize}
            rankGlyphSize={rankGlyphSize}
          />
          {approveActions ? (
            <CaptainTradeProposalApproveButton
              isPending={approveActions.isPending}
              accentColor={color}
              onClick={approveActions.onBegin}
              onConfirm={approveActions.onConfirm}
              onCancel={approveActions.onCancel}
            />
          ) : (
            <div
              className="flex shrink-0 items-center justify-center rounded-full border p-1.5 text-[var(--draft-text-medium)]"
              style={{ borderColor: `${color}44`, backgroundColor: `${color}10` }}
              aria-hidden="true"
            >
              <TradeSwapIcon className="h-5 w-5" />
            </div>
          )}
          <TradePlayerSide
            player={trade.offeredPlayer}
            linkPlayerProfiles={linkPlayerProfiles}
            avatarSize={avatarSize}
            rankGlyphSize={rankGlyphSize}
          />
        </div>
        {footer ? <div className="mt-2 border-t border-[var(--draft-divider)] pt-2">{footer}</div> : null}
      </div>
    </div>
  );
}

"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { PickClock } from "@/components/pick-clock";
import { getContrastTextColor } from "@/lib/color-contrast";
import { DRAFT_ROOM_DARK } from "@/lib/draft-room-theme";

type Team = { id: string; captainName: string; color: string };
type TurnSlot = { pickNumber: number; teamId: string; round?: number };

type Props = {
  onClockTeamId: string | null;
  turnQueue: TurnSlot[];
  teams: Team[];
  isLive: boolean;
  onClockStartedAt: string | null;
  layout?: "horizontal" | "vertical";
  singleLineQueue?: boolean;
  className?: string;
};

const theme = DRAFT_ROOM_DARK;
const CHIP_GAP_PX = 8;

function TurnQueueChip({ slot, team }: { slot: TurnSlot; team: Team | undefined }) {
  const backgroundColor = team?.color ?? "#71717a";
  return (
    <span
      data-queue-chip
      className="shrink-0 rounded px-2 py-1 text-xs whitespace-nowrap"
      style={{
        backgroundColor,
        color: getContrastTextColor(backgroundColor),
      }}
    >
      #{slot.pickNumber} {team?.captainName}
    </span>
  );
}

function UpNextQueue({
  slots,
  teams,
  singleLine,
  labelClassName,
}: {
  slots: TurnSlot[];
  teams: Team[];
  singleLine: boolean;
  labelClassName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(slots.length);

  useLayoutEffect(() => {
    if (!singleLine) {
      setVisibleCount(slots.length);
      return;
    }

    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    function updateVisibleCount() {
      const chips = measure!.querySelectorAll<HTMLElement>("[data-queue-chip]");
      const available = container!.clientWidth;
      let used = 0;
      let count = 0;

      for (const chip of chips) {
        const chipWidth = chip.offsetWidth;
        const nextUsed = count === 0 ? chipWidth : used + CHIP_GAP_PX + chipWidth;
        if (count > 0 && nextUsed > available) break;
        used = nextUsed;
        count++;
      }

      setVisibleCount(count);
    }

    updateVisibleCount();
    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(container);
    return () => observer.disconnect();
  }, [singleLine, slots]);

  if (slots.length === 0) return null;

  const visibleSlots = singleLine ? slots.slice(0, visibleCount) : slots;
  const LabelTag = singleLine ? "span" : "p";

  const chipRow = singleLine ? (
    <div className="relative min-w-0 flex-1">
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex gap-2 overflow-hidden opacity-0"
      >
        {slots.map((slot) => (
          <TurnQueueChip
            key={slot.pickNumber}
            slot={slot}
            team={teams.find((t) => t.id === slot.teamId)}
          />
        ))}
      </div>
      <div ref={containerRef} className="flex min-w-0 flex-nowrap gap-2 overflow-hidden">
        {visibleSlots.map((slot) => (
          <TurnQueueChip
            key={slot.pickNumber}
            slot={slot}
            team={teams.find((t) => t.id === slot.teamId)}
          />
        ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-wrap gap-2">
      {visibleSlots.map((slot) => (
        <TurnQueueChip
          key={slot.pickNumber}
          slot={slot}
          team={teams.find((t) => t.id === slot.teamId)}
        />
      ))}
    </div>
  );

  if (singleLine) {
    return (
      <div className="flex w-full min-w-0 items-center gap-3">
        <LabelTag className={`shrink-0 ${labelClassName}`}>Up next</LabelTag>
        {chipRow}
      </div>
    );
  }

  return (
    <>
      <LabelTag className={labelClassName}>Up next</LabelTag>
      {chipRow}
    </>
  );
}

export function DraftCurrentPickPanel({
  onClockTeamId,
  turnQueue,
  teams,
  isLive,
  onClockStartedAt,
  layout = "vertical",
  singleLineQueue = false,
  className = "",
}: Props) {
  const onClock = teams.find((t) => t.id === onClockTeamId);
  if (!onClock || turnQueue.length === 0) return null;

  const upNext = turnQueue.slice(1);
  const upNextLabelClass =
    layout === "horizontal"
      ? `shrink-0 text-xs font-medium uppercase tracking-wide ${theme.turnLabel}`
      : `mb-2 text-xs font-medium uppercase tracking-wide ${theme.turnLabel}`;

  return (
    <div className={`rounded border-2 ${theme.turnSection} p-3 ${className}`}>
      {layout === "horizontal" ? (
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex shrink-0 items-baseline gap-3">
            <span className={`text-xs font-medium uppercase tracking-wide ${theme.turnLabel}`}>
              Current Pick
            </span>
            <PickClock isLive={isLive} startedAt={onClockStartedAt} />
            <span className="text-2xl font-semibold">{onClock.captainName}&apos;s Turn</span>
          </div>
          {upNext.length > 0 ? (
            <>
              <div className="hidden h-8 w-px shrink-0 bg-[var(--draft-divider)] sm:block" />
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <UpNextQueue
                  slots={upNext}
                  teams={teams}
                  singleLine={singleLineQueue}
                  labelClassName={upNextLabelClass}
                />
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-3">
            <p className={`text-xs font-medium uppercase tracking-wide ${theme.turnLabel}`}>
              Current Pick
            </p>
            <PickClock isLive={isLive} startedAt={onClockStartedAt} />
          </div>
          <p className="mb-2 text-base font-semibold">{onClock.captainName}&apos;s Turn</p>
          {upNext.length > 0 ? (
            <UpNextQueue
              slots={upNext}
              teams={teams}
              singleLine={singleLineQueue}
              labelClassName={upNextLabelClass}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

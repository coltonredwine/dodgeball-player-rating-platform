"use client";

import { useEffect, useState } from "react";
import {
  formatPickClockElapsed,
  PICK_CLOCK_FULL_SECONDS,
  PICK_CLOCK_YELLOW_SECONDS,
} from "@/components/pick-clock";

type Props = {
  isLive: boolean;
  startedAt: string | null;
  size?: number;
};

export function PickClockRing({ isLive, startedAt, size = 120 }: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isLive || !startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const clockStart = startedAt;

    function tick() {
      const startMs = new Date(clockStart).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isLive, startedAt]);

  const isYellow = elapsedSeconds >= PICK_CLOCK_YELLOW_SECONDS;
  const isBlinking = elapsedSeconds >= PICK_CLOCK_FULL_SECONDS;
  const progress = Math.min(1, elapsedSeconds / PICK_CLOCK_FULL_SECONDS);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--draft-surface-4)"
            strokeWidth={4}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isYellow ? "#facc15" : "var(--draft-accent-dim)"}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={[
              "transition-[stroke-dashoffset] duration-1000",
              isBlinking ? "draft-pick-clock-blink" : "",
            ].join(" ")}
            style={{
              filter: isLive ? "drop-shadow(0 0 6px color-mix(in srgb, var(--draft-accent) 55%, transparent))" : undefined,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={[
              "font-mono text-2xl font-semibold tabular-nums text-[var(--draft-text-high)]",
              isBlinking ? "draft-pick-clock-blink" : "",
            ].join(" ")}
          >
            {formatPickClockElapsed(elapsedSeconds)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--draft-text-medium)]">
            Elapsed
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type Props = {
  isLive: boolean;
  startedAt: string | null;
  className?: string;
  tone?: "light" | "dark";
};

export const PICK_CLOCK_YELLOW_SECONDS = 120;
export const PICK_CLOCK_FULL_SECONDS = 180;

export function formatPickClockElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PickClock({ isLive, startedAt, className = "", tone = "dark" }: Props) {
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

  const colorClass =
    tone === "light"
      ? isYellow
        ? "text-amber-600"
        : "text-zinc-700"
      : isYellow
        ? "text-amber-300"
        : "text-[var(--draft-text-high)]";

  return (
    <span
      className={[
        "inline-flex items-center font-mono text-sm tabular-nums",
        colorClass,
        isBlinking ? "draft-pick-clock-blink" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Pick clock ${formatPickClockElapsed(elapsedSeconds)}`}
    >
      {formatPickClockElapsed(elapsedSeconds)}
    </span>
  );
}

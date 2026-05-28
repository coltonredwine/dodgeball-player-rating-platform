"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  userKey: string;
};

export function RatingGuideModal({ userKey }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [todayKey] = useState(() => new Date().toISOString().slice(0, 10));
  const storageKey = useMemo(
    () => `rating-guide-ack:${userKey}:${todayKey}`,
    [userKey, todayKey],
  );
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`rating-guide-ack:${userKey}:${todayKey}`) !== "true";
  });
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element || canDismiss) return;
    const reachedBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 8;
    if (reachedBottom) setCanDismiss(true);
  }

  function acknowledge() {
    if (!canDismiss) return;
    localStorage.setItem(storageKey, "true");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-guide-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b border-zinc-200 p-4">
          <h2 id="rating-guide-title" className="text-xl font-semibold">
            Dodgeball Rating Guide
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Read this before rating. Scroll to the bottom to confirm you understand.
          </p>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="space-y-4 overflow-y-auto p-4 text-sm text-zinc-800"
        >
          <p>
            This system creates consistent player rankings for league balance. Use on-court
            impact and rate each player on six skills from 1 to 7.
          </p>

          <div>
            <h3 className="font-semibold">Six Skills</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Power: Throwing power and velocity impact.</li>
              <li>Accuracy: Ability to hit intended targets reliably.</li>
              <li>Catching: Ability to secure live-ball catches consistently.</li>
              <li>Evasion: Dodging and blocking effectiveness under pressure.</li>
              <li>
                Intimidation: Presence, confidence, and reputation that force opponent mistakes.
              </li>
              <li>
                Nerve: Strategy, composure, teamwork, clutch consistency, and overall game IQ.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">1-7 Scale</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>1: New / undeveloped.</li>
              <li>2: Somewhat new, uncompetitive in upper division.</li>
              <li>3: Capable, but inconsistent skill.</li>
              <li>4: Solid and performs the skill reliably.</li>
              <li>5: Above average and noticeable.</li>
              <li>6: Excellent, a defining skill.</li>
              <li>7: Best in league, rare and elite.</li>
            </ul>
          </div>

          <div className="rounded border border-yellow-300 bg-yellow-100 p-3">
            <h3 className="font-semibold">Important Guidance</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Most players should land in the 3-5 range.</li>
              <li>
                <span className="font-semibold underline">Use 6s sparingly and 7s rarely.</span>
              </li>
              <li>
                Rate consistnetly across players. Rate on the performance you see most often,{" "}
                <em>not</em> the best you have seen the player perform.
              </li>
              <li>Consistency across raters is more important than perfection.</li>
              <li>If unsure between two numbers, stay closer to average unless impact is clear.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">Definitions that matter</h3>
            <p className="mt-1">
              Intimidation is pre-throw impact. Nerve is game intelligence, composure, and
              high-pressure performance. These are often what separate good players from great
              players.
            </p>
          </div>

          <p className="text-zinc-500">
            Keep scrolling to enable the acknowledgment button.
          </p>
        </div>

        <div className="border-t border-zinc-200 p-4">
          <button
            type="button"
            onClick={acknowledge}
            disabled={!canDismiss}
            className={`w-full rounded px-4 py-2 text-sm text-white ${
              canDismiss
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-zinc-400 disabled:cursor-not-allowed"
            }`}
          >
            I understand the rating system
          </button>
        </div>
      </div>
    </div>
  );
}

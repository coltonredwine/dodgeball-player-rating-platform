"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DraftBoardView, type DraftBoardStatus } from "@/components/draft-board-view";
import { leaguePath } from "@/lib/league-path";

type Props = {
  leagueSlug: string;
  draftId: string;
  readOnly?: boolean;
  onOpenSettings?: () => void;
};

export function DraftAdminPanel({
  leagueSlug,
  draftId,
  readOnly = false,
  onOpenSettings,
}: Props) {
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState("setup");
  const [boardStatus, setBoardStatus] = useState<DraftBoardStatus | null>(null);
  const [publicBoardEnabled, setPublicBoardEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const handleBoardStatusChange = useCallback((next: DraftBoardStatus) => {
    setBoardStatus(next);
    setIsLive(next.isLive);
    setStatus(next.draftStatus);
  }, []);

  const loadMeta = useCallback(async () => {
    const res = await fetch(`/api/admin/drafts/${draftId}`);
    if (!res.ok) return;
    const data = await res.json();
    setIsLive(data.draft.isLive);
    setStatus(data.draft.status);
    setPublicBoardEnabled(data.draft.displaySettings?.publicBoardEnabled ?? false);
  }, [draftId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  function bumpBoardRefresh() {
    setRefreshSignal((value) => value + 1);
  }

  async function toggleLive() {
    const next = !isLive;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/drafts/${draftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLive: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not update live status");
      return;
    }
    await loadMeta();
    bumpBoardRefresh();
  }

  async function undoPick() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/drafts/${draftId}/undo`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setMessage("Nothing to undo");
      return;
    }
    setMessage("Undid last pick");
    bumpBoardRefresh();
  }

  async function skipTurn() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/drafts/${draftId}/skip-turn`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not skip turn");
      return;
    }
    setMessage(data.completed ? "Skipped turn — draft complete" : "Skipped turn");
    bumpBoardRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-zinc-200 bg-zinc-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly ? (
              <>
            <button
              type="button"
              disabled={busy || status === "complete"}
              className={
                isLive
                  ? "inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
                  : "rounded bg-green-700 px-3 py-2 text-sm text-white disabled:opacity-50"
              }
              onClick={toggleLive}
            >
              {isLive ? (
                <>
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                  Pause draft
                </>
              ) : (
                "Go live"
              )}
            </button>
            <button
              type="button"
              disabled={busy || status === "complete" || !isLive || !boardStatus?.onClockCaptainName}
              className="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
              onClick={skipTurn}
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
                <path d="M5 4l10 8-10 8V4z" />
                <path d="M19 5v14" />
              </svg>
              Skip turn
            </button>
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
              onClick={undoPick}
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 7 4 12l5 5" />
                <path d="M20 12H4" />
              </svg>
              Undo last pick
            </button>
            {onOpenSettings ? (
              <button
                type="button"
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100"
                onClick={onOpenSettings}
              >
                Draft settings
              </button>
            ) : null}
              </>
            ) : null}
            <Link
              href={leaguePath(leagueSlug, `/draft/${draftId}/board`)}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100"
              target="_blank"
            >
              Open TV board
            </Link>
            {publicBoardEnabled ? (
              <Link
                href={leaguePath(leagueSlug, `/draft/${draftId}/public`)}
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100"
                target="_blank"
              >
                Open public board
              </Link>
            ) : null}
            {!readOnly ? (
              <Link
                href={leaguePath(leagueSlug, `/draft/${draftId}/pick`)}
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100"
                target="_blank"
              >
                Captain view
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
            {boardStatus ? (
              <>
                {boardStatus.isLive ? (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900">
                    Live
                  </span>
                ) : (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                    Not live
                  </span>
                )}
                <span>
                  Pick {Math.min(boardStatus.picksMade, boardStatus.totalPicks)} /{" "}
                  {boardStatus.totalPicks}
                  {boardStatus.onClockCaptainName
                    ? ` — ${boardStatus.onClockCaptainName}'s turn`
                    : boardStatus.draftStatus === "complete"
                      ? " — Complete"
                      : ""}
                </span>
              </>
            ) : (
              <span>
                Status: {status} · {isLive ? "Live" : "Not live"}
              </span>
            )}
          </div>
        </div>
        {message ? <p className="mt-2 text-sm text-blue-700">{message}</p> : null}
      </div>

      <DraftBoardView
        draftId={draftId}
        mode="admin"
        adminReadOnly={readOnly}
        refreshSignal={refreshSignal}
        onStatusChange={handleBoardStatusChange}
      />
    </div>
  );
}

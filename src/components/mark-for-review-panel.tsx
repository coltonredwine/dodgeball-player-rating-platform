"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function MarkForReviewPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runMarkForReview() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/settings/mark-for-review", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not mark players for review");
        return;
      }
      const count = typeof data.updatedCount === "number" ? data.updatedCount : 0;
      setMessage(
        count === 0
          ? "No completed player ratings found to mark for review."
          : `Marked ${count} completed player rating${count === 1 ? "" : "s"} for review. Raters will see those rows in yellow until they confirm each one.`,
      );
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-w-0 space-y-3 rounded border border-zinc-200 p-4 md:col-span-2">
      <h2 className="font-semibold">Season rating review</h2>
      <p className="text-xs text-zinc-600">
        Mark every player that raters have already fully scored (or marked unknown) so those rows
        appear yellow on the rate page until each rater confirms they have re-checked the scores.
        Incomplete rows are left alone.
      </p>
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        className="rounded border border-amber-400 bg-amber-50 px-3 py-1.5 text-sm text-amber-950 hover:bg-amber-100 disabled:opacity-50"
        disabled={busy}
        onClick={() => setConfirmOpen(true)}
      >
        Mark all players to review
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Mark all rated players for review?"
        message="Completed scores for every rater in the current season will show yellow until each rater confirms with the check button. Incomplete scores are unchanged."
        confirmLabel="Mark for review"
        pending={busy}
        confirmClassName="bg-amber-600"
        onConfirm={() => void runMarkForReview()}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}

"use client";

import { FormEvent } from "react";
import { formatCloseAtForDatetimeLocal, parseDatetimeLocalToIso } from "@/lib/scoring-window";

type Props = {
  manualOpen: boolean;
  closeAtIso: string;
  effectiveOpen: boolean;
  closeAtDisplay: string | null;
};

export function ScoringWindowForm({
  manualOpen,
  closeAtIso,
  effectiveOpen,
  closeAtDisplay,
}: Props) {
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const localCloseAt = String(formData.get("scoringCloseAt") ?? "");
    const parsed = parseDatetimeLocalToIso(localCloseAt);
    if (localCloseAt && !parsed) {
      window.alert("Invalid close date/time.");
      return;
    }
    formData.set("scoringCloseAt", parsed ?? "");
    const response = await fetch("/api/admin/settings/scoring", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      redirect: "follow",
    });
    if (response.redirected) {
      window.location.assign(response.url);
      return;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(payload?.error ?? "Save failed");
    }
  }

  return (
    <form
      className="min-w-0 space-y-3 rounded border border-zinc-200 p-4"
      onSubmit={onSubmit}
    >
      <h2 className="font-semibold">Scoring window</h2>
      <p className="text-xs text-zinc-600">
        When closed, raters can view their saved scores but cannot change or submit them. You can
        close scoring manually or schedule an automatic close date and time.
      </p>
      <p className="text-xs font-medium text-zinc-800">
        Currently:{" "}
        <span className={effectiveOpen ? "text-green-700" : "text-red-700"}>
          {effectiveOpen ? "Open" : "Closed"}
        </span>
        {closeAtDisplay ? (
          <span className="font-normal text-zinc-600">
            {" "}
            · Scheduled close: {closeAtDisplay}
            {!effectiveOpen && manualOpen ? " (passed)" : ""}
          </span>
        ) : null}
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="scoringOpen" value="true" defaultChecked={manualOpen} />
        Open for submissions
      </label>
      <label className="block text-sm">
        Automatically close at
        <input
          className="mt-1 w-full min-w-0 rounded border border-zinc-300 px-2 py-1"
          type="datetime-local"
          name="scoringCloseAt"
          defaultValue={formatCloseAtForDatetimeLocal(closeAtIso)}
        />
      </label>
      <p className="text-xs text-zinc-500">
        Uses your browser&apos;s local time zone. Leave blank for no scheduled close.
      </p>
      <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white" type="submit">
        Save scoring settings
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { DraftAdminPanel } from "@/components/draft-admin-panel";
import { DraftScoresPanel } from "@/components/draft-scores-panel";

type Props = {
  draftId: string;
  readOnly?: boolean;
  onOpenSettings?: () => void;
};

export function DraftDashboardTabs({ draftId, readOnly = false, onOpenSettings }: Props) {
  const [tab, setTab] = useState<"live" | "scores">("live");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-zinc-200">
        <button
          type="button"
          className={
            tab === "live"
              ? "border-b-2 border-zinc-900 px-3 py-2 text-sm font-medium"
              : "px-3 py-2 text-sm text-zinc-600"
          }
          onClick={() => setTab("live")}
        >
          Live draft
        </button>
        <button
          type="button"
          className={
            tab === "scores"
              ? "border-b-2 border-zinc-900 px-3 py-2 text-sm font-medium"
              : "px-3 py-2 text-sm text-zinc-600"
          }
          onClick={() => setTab("scores")}
        >
          Scores
        </button>
      </div>
      {tab === "live" ? (
        <DraftAdminPanel draftId={draftId} readOnly={readOnly} onOpenSettings={onOpenSettings} />
      ) : (
        <DraftScoresPanel draftId={draftId} readOnly={readOnly} />
      )}
    </div>
  );
}

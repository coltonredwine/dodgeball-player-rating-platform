"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DraftDashboardTabs } from "@/components/draft-dashboard-tabs";
import { DraftSettingsModal } from "@/components/draft-settings-modal";
import { leaguePath } from "@/lib/league-path";

type Props = {
  leagueSlug: string;
  draftId: string;
  draftName: string;
  readOnly?: boolean;
};

export function DraftPageClient({
  leagueSlug,
  draftId,
  draftName,
  readOnly = false,
}: Props) {
  const searchParams = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!readOnly && searchParams.get("settings") === "1") {
      setSettingsOpen(true);
    }
  }, [readOnly, searchParams]);

  function handleSaved() {
    setRefreshKey((value) => value + 1);
  }

  return (
    <>
      <Link
        className="text-sm text-blue-700 underline"
        href={leaguePath(leagueSlug, "/backend/drafts")}
      >
        ← All drafts
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{draftName}</h1>
        {!readOnly ? (
          <button
            type="button"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            onClick={() => setSettingsOpen(true)}
          >
            Draft settings
          </button>
        ) : null}
      </div>
      <DraftDashboardTabs
        key={refreshKey}
        leagueSlug={leagueSlug}
        draftId={draftId}
        readOnly={readOnly}
        onOpenSettings={readOnly ? undefined : () => setSettingsOpen(true)}
      />
      {!readOnly ? (
        <DraftSettingsModal
          open={settingsOpen}
          draftId={draftId}
          draftName={draftName}
          onClose={() => setSettingsOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}
    </>
  );
}

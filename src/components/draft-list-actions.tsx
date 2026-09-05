"use client";

import Link from "next/link";
import { DraftSettingsTrigger } from "@/components/draft-settings-trigger";
import { leaguePath } from "@/lib/league-path";

type Props = {
  leagueSlug: string;
  draftId: string;
  draftName: string;
  readOnly?: boolean;
};

export function DraftListActions({
  leagueSlug,
  draftId,
  draftName,
  readOnly = false,
}: Props) {
  return (
    <div className="flex gap-2 text-sm">
      {!readOnly ? (
        <DraftSettingsTrigger
          draftId={draftId}
          draftName={draftName}
          className="underline"
          label="Settings"
        />
      ) : null}
      <Link className="underline" href={leaguePath(leagueSlug, `/backend/drafts/${draftId}`)}>
        Open
      </Link>
      <Link
        className="underline"
        href={leaguePath(leagueSlug, `/draft/${draftId}/board`)}
        target="_blank"
      >
        TV board
      </Link>
    </div>
  );
}

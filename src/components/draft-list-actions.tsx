"use client";

import Link from "next/link";
import { DraftSettingsTrigger } from "@/components/draft-settings-trigger";

type Props = {
  draftId: string;
  draftName: string;
  readOnly?: boolean;
};

export function DraftListActions({ draftId, draftName, readOnly = false }: Props) {
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
      <Link className="underline" href={`/backend/drafts/${draftId}`}>
        Open
      </Link>
      <Link className="underline" href={`/draft/${draftId}/board`} target="_blank">
        TV board
      </Link>
    </div>
  );
}

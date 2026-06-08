"use client";

import Link from "next/link";
import { DraftSettingsTrigger } from "@/components/draft-settings-trigger";

type Props = {
  draftId: string;
  draftName: string;
};

export function DraftListActions({ draftId, draftName }: Props) {
  return (
    <div className="flex gap-2 text-sm">
      <DraftSettingsTrigger
        draftId={draftId}
        draftName={draftName}
        className="underline"
        label="Settings"
      />
      <Link className="underline" href={`/backend/drafts/${draftId}`}>
        Open
      </Link>
      <Link className="underline" href={`/draft/${draftId}/board`} target="_blank">
        TV board
      </Link>
    </div>
  );
}

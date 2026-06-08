"use client";

import { useState } from "react";
import { DraftSettingsModal } from "@/components/draft-settings-modal";

type Props = {
  draftId: string;
  draftName: string;
  className?: string;
  label?: string;
  onSaved?: () => void;
};

export function DraftSettingsTrigger({
  draftId,
  draftName,
  className = "rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50",
  label = "Draft settings",
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <DraftSettingsModal
        open={open}
        draftId={draftId}
        draftName={draftName}
        onClose={() => setOpen(false)}
        onSaved={onSaved}
      />
    </>
  );
}

"use client";

import { useEffect } from "react";
import { DraftSettingsPanel } from "@/components/draft-settings-panel";

type Props = {
  open: boolean;
  draftId: string;
  draftName: string;
  onClose: () => void;
  onSaved?: () => void;
};

export function DraftSettingsModal({ open, draftId, draftName, onClose, onSaved }: Props) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-settings-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 id="draft-settings-title" className="text-lg font-semibold">
              Draft settings
            </h2>
            <p className="text-sm text-zinc-600">{draftName}</p>
          </div>
          <button
            type="button"
            className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">
          <DraftSettingsPanel
            draftId={draftId}
            onSaved={() => {
              onSaved?.();
            }}
          />
        </div>
      </div>
    </div>
  );
}

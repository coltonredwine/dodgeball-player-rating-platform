"use client";

import { useEffect, useRef, useState } from "react";
import { TeamColorGrid } from "@/components/team-color-grid";

type Props = {
  value: string;
  takenColors?: readonly string[];
  disabled?: boolean;
  onChange: (color: string) => void;
};

export function TeamColorPicker({ value, takenColors = [], disabled = false, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-label="Choose team color"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="h-6 w-6 rounded-full border border-zinc-300 ring-offset-2 transition-shadow hover:ring-2 hover:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: value }}
        onClick={() => setOpen((current) => !current)}
      />

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-2 w-max rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
          <TeamColorGrid
            value={value}
            takenColors={takenColors}
            disabled={disabled}
            onChange={(color) => {
              onChange(color);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

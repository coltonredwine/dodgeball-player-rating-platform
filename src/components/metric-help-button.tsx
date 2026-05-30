"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

type Props = {
  label: string;
  description: string;
  compact?: boolean;
};

const POPOVER_WIDTH = 224;
const VIEWPORT_PADDING = 12;

export function MetricHelpButton({ label, description, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPopoverStyle(null);
      return;
    }

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      let left = rect.left;
      const maxLeft = window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING;
      left = Math.min(left, maxLeft);
      left = Math.max(VIEWPORT_PADDING, left);

      setPopoverStyle({
        top: rect.bottom + 4,
        left,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={popoverId}
        className={`inline-flex items-center justify-center rounded bg-zinc-800 text-xs text-white ${
          compact ? "h-4 min-w-4 px-0.5" : "ml-1 h-5 min-w-5 px-1"
        }`}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      {open && popoverStyle ? (
        <div
          id={popoverId}
          role="tooltip"
          style={{ top: popoverStyle.top, left: popoverStyle.left }}
          className="fixed z-50 w-56 max-w-[calc(100vw-1.5rem)] rounded border border-zinc-300 bg-white p-2 text-left text-xs font-normal normal-case text-zinc-800 shadow-lg"
        >
          <p className="mb-1 font-semibold capitalize">{label}</p>
          <p className="leading-snug">{description}</p>
          <button
            type="button"
            className="mt-2 rounded bg-zinc-100 px-2 py-0.5 text-zinc-700"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { TEAM_COLOR_PALETTE } from "@/lib/draft/constants";

export type TeamColorGridProps = {
  value: string;
  takenColors?: readonly string[];
  disabled?: boolean;
  surface?: "light" | "dark";
  onChange: (color: string) => void;
};

export function TeamColorGrid({
  value,
  takenColors = [],
  disabled = false,
  surface = "light",
  onChange,
}: TeamColorGridProps) {
  const taken = new Set(takenColors.filter((color) => color !== value));
  const isDark = surface === "dark";
  const hasTakenColors = taken.size > 0;
  const slashClass = isDark ? "bg-white/95" : "bg-zinc-900/90";
  const legendClass = isDark ? "text-[var(--draft-text-medium)]" : "text-zinc-500";

  return (
    <div>
      <div className="grid grid-cols-3 gap-2" role="listbox" aria-label="Team colors">
        {TEAM_COLOR_PALETTE.map((color) => {
          const selected = color === value;
          const unavailable = taken.has(color);
          const colorDisabled = disabled || unavailable;

          return (
            <div key={color} className="relative h-8 w-8 shrink-0">
              <button
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={unavailable || undefined}
                aria-label={
                  unavailable
                    ? `Color ${color} (taken by another captain)`
                    : selected
                      ? `Color ${color} (your team color)`
                      : `Color ${color}`
                }
                disabled={colorDisabled}
                title={unavailable ? "Taken by another captain" : undefined}
                className={[
                  "box-border h-8 w-8 rounded-full border-2 transition-[border-color,box-shadow,filter,opacity]",
                  unavailable
                    ? "cursor-not-allowed border-dashed opacity-45 grayscale"
                    : "hover:border-zinc-400 hover:ring-2 hover:ring-zinc-300/60",
                  selected
                    ? isDark
                      ? "border-[var(--draft-text-high)] ring-2 ring-[var(--draft-text-high)]/40"
                      : "border-zinc-900 ring-2 ring-zinc-900/25"
                    : unavailable
                      ? isDark
                        ? "border-[var(--draft-text-medium)]/70"
                        : "border-zinc-400"
                      : isDark
                        ? "border-[var(--draft-divider)]"
                        : "border-zinc-200",
                ].join(" ")}
                style={{ backgroundColor: color }}
                onClick={() => {
                  if (colorDisabled || selected) return;
                  onChange(color);
                }}
              />
              {unavailable ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <span className={`h-[3px] w-[120%] rotate-45 rounded-full ${slashClass}`} />
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {hasTakenColors ? (
        <p className={`mt-2 text-[10px] leading-snug ${legendClass}`}>
          Slashed colors are taken by other captains.
        </p>
      ) : null}
    </div>
  );
}

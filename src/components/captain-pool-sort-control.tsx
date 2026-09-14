import {
  CAPTAIN_POOL_SORT_OPTIONS,
  type CaptainPoolSortField,
} from "@/lib/draft/pool-sort";
import type { SortDirection } from "@/lib/draft/roster-sort";

export function CaptainPoolSortControl({
  value,
  onChange,
  direction = "desc",
  onDirectionChange,
  className = "",
}: {
  value: CaptainPoolSortField;
  onChange: (field: CaptainPoolSortField) => void;
  direction?: SortDirection;
  onDirectionChange?: (direction: SortDirection) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--draft-text-medium)]">
        Sort by
      </p>
      <div
        className="mt-1.5 flex flex-wrap gap-1"
        role="group"
        aria-label="Sort players by"
      >
        {CAPTAIN_POOL_SORT_OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={[
                "rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors",
                active
                  ? "border-[var(--draft-accent)] bg-[var(--draft-surface-3)] text-[var(--draft-text-high)]"
                  : "border-[var(--draft-divider)] bg-[var(--draft-surface-1)] text-[var(--draft-text-medium)] hover:bg-[var(--draft-hover)]",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {onDirectionChange ? (
        <div
          className="mt-1.5 flex flex-wrap gap-1"
          role="group"
          aria-label="Sort direction"
        >
            {(
            [
              { value: "desc", label: "Descending (rank 1 first)" },
              { value: "asc", label: "Ascending (rank 5 first)" },
            ] as const
          ).map((option) => {
            const active = direction === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onDirectionChange(option.value)}
                className={[
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-[var(--draft-accent)] bg-[var(--draft-surface-3)] text-[var(--draft-text-high)]"
                    : "border-[var(--draft-divider)] bg-[var(--draft-surface-1)] text-[var(--draft-text-medium)] hover:bg-[var(--draft-hover)]",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

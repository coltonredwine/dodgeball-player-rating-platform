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
  rankDirection = "desc",
  onRankDirectionChange,
  groupByRank = true,
  onGroupByRankChange,
  className = "",
}: {
  value: CaptainPoolSortField;
  onChange: (field: CaptainPoolSortField) => void;
  direction?: SortDirection;
  onDirectionChange?: (direction: SortDirection) => void;
  rankDirection?: SortDirection;
  onRankDirectionChange?: (direction: SortDirection) => void;
  groupByRank?: boolean;
  onGroupByRankChange?: (groupByRank: boolean) => void;
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
          aria-label="Score sort direction"
        >
          {(
            [
              { value: "desc", label: "High to low" },
              { value: "asc", label: "Low to high" },
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
      {onRankDirectionChange ? (
        <>
          <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--draft-text-medium)]">
            Rank order
          </p>
          <div
            className="mt-1.5 flex flex-wrap gap-1"
            role="group"
            aria-label="Rank sort direction"
          >
            {(
              [
                { value: "desc", label: "Descending (rank 5 first)" },
                { value: "asc", label: "Ascending (rank 1 first)" },
              ] as const
            ).map((option) => {
              const active = rankDirection === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onRankDirectionChange(option.value)}
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
        </>
      ) : null}
      {onGroupByRankChange ? (
        <label className="mt-2.5 flex items-center gap-2 text-xs text-[var(--draft-text-medium)]">
          <input
            type="checkbox"
            checked={groupByRank}
            onChange={(e) => onGroupByRankChange(e.target.checked)}
            className="rounded border-[var(--draft-divider)]"
          />
          Group by rank
        </label>
      ) : null}
    </div>
  );
}

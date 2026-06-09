import type { DraftTeamSortMode } from "@/lib/draft/team-sort";

const OPTIONS: Array<{ value: DraftTeamSortMode; label: string }> = [
  { value: "pickOrder", label: "Pick order" },
  { value: "avgRank", label: "Avg rank" },
];

export function DraftTeamSortControl({
  value,
  onChange,
  rankSortEnabled = true,
  className = "",
}: {
  value: DraftTeamSortMode;
  onChange: (mode: DraftTeamSortMode) => void;
  rankSortEnabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--draft-text-medium)]">
        Sort teams by
      </p>
      <div
        className="mt-1.5 flex flex-wrap justify-center gap-1"
        role="group"
        aria-label="Sort team cards by"
      >
        {OPTIONS.map((option) => {
          const disabled = option.value === "avgRank" && !rankSortEnabled;
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={[
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
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
    </div>
  );
}

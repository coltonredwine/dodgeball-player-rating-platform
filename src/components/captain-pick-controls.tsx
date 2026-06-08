export function CaptainBookmarkButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={active ? "Remove saved player" : "Save player"}
      aria-pressed={active}
      className={`shrink-0 rounded p-1 transition-colors ${
        active
          ? "text-sky-400 hover:text-sky-300"
          : "text-[var(--draft-text-disabled)] hover:text-[var(--draft-text-medium)]"
      }`}
      onClick={onClick}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-7-4-7 4V4z" />
      </svg>
    </button>
  );
}

export function CaptainPlayerPickActions({
  playerId,
  showChoose,
  chooseDisabled,
  isPending,
  onChoose,
  onConfirm,
  onCancel,
}: {
  playerId: string;
  showChoose: boolean;
  chooseDisabled: boolean;
  isPending: boolean;
  onChoose: (playerId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!showChoose) return null;

  const iconButtonClass = chooseDisabled
    ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--draft-divider)] bg-[var(--draft-surface-3)] text-[var(--draft-text-disabled)] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    : "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--draft-accent)_70%,var(--draft-divider))] bg-[color:color-mix(in_srgb,var(--draft-accent)_45%,var(--draft-surface-3))] text-[var(--draft-accent)] shadow-[0_0_10px_color-mix(in_srgb,var(--draft-accent)_35%,transparent)] transition-colors hover:border-[var(--draft-accent)] hover:bg-[color:color-mix(in_srgb,var(--draft-accent)_55%,var(--draft-surface-3))] hover:text-[var(--draft-text-high)] disabled:cursor-not-allowed disabled:opacity-40";

  if (isPending) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Cancel pick"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--draft-text-medium)] hover:bg-[var(--draft-hover)] hover:text-[var(--draft-text-high)]"
          onClick={onCancel}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Confirm pick"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-700 text-white hover:bg-green-600"
          onClick={onConfirm}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="Choose player"
      disabled={chooseDisabled}
      className={iconButtonClass}
      onClick={() => onChoose(playerId)}
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

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

const confirmCancelActionsClass =
  "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors";

function CaptainConfirmCancelActions({
  cancelLabel,
  confirmLabel,
  confirmClassName,
  onCancel,
  onConfirm,
}: {
  cancelLabel: string;
  confirmLabel: string;
  confirmClassName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label={cancelLabel}
        className={`${confirmCancelActionsClass} text-[var(--draft-text-medium)] hover:bg-[var(--draft-hover)] hover:text-[var(--draft-text-high)]`}
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
        aria-label={confirmLabel}
        className={`${confirmCancelActionsClass} ${confirmClassName}`}
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
      <CaptainConfirmCancelActions
        cancelLabel="Cancel pick"
        confirmLabel="Confirm pick"
        confirmClassName="bg-green-700 text-white hover:bg-green-600"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
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

export function TradeSwapIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`rotate-90 ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 16V4M7 4L3 8M7 4l4 4" />
      <path d="M17 8v12M17 20l4-4M17 20l-4-4" />
    </svg>
  );
}

export function CaptainTradeSwapButton({
  disabled = false,
  isPending = false,
  selected = false,
  onClick,
  onConfirm,
  onCancel,
}: {
  disabled?: boolean;
  isPending?: boolean;
  selected?: boolean;
  onClick: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (isPending) {
    return (
      <CaptainConfirmCancelActions
        cancelLabel="Cancel trade"
        confirmLabel="Confirm trade proposal"
        confirmClassName="bg-sky-700 text-white hover:bg-sky-600"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label="Propose trade"
      aria-pressed={selected}
      disabled={disabled}
      className={[
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "border-sky-600/70 bg-sky-950/40 text-sky-300"
          : "border-[var(--draft-divider)] bg-[var(--draft-surface-3)] text-[var(--draft-text-medium)] hover:border-sky-600/70 hover:bg-sky-950/40 hover:text-sky-300",
      ].join(" ")}
      onClick={onClick}
    >
      <TradeSwapIcon />
    </button>
  );
}

export function CaptainTradeProposalApproveButton({
  isPending = false,
  accentColor,
  onClick,
  onConfirm,
  onCancel,
}: {
  isPending?: boolean;
  accentColor: string;
  onClick: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (isPending) {
    return (
      <CaptainConfirmCancelActions
        cancelLabel="Cancel trade approval"
        confirmLabel="Confirm accept trade"
        confirmClassName="bg-green-700 text-white hover:bg-green-600"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label="Accept trade proposal"
      className="flex shrink-0 items-center justify-center rounded-full border p-1.5 text-[var(--draft-text-medium)] transition-colors hover:text-[var(--draft-text-high)]"
      style={{ borderColor: `${accentColor}44`, backgroundColor: `${accentColor}10` }}
      onClick={onClick}
    >
      <TradeSwapIcon className="h-5 w-5" />
    </button>
  );
}

export function CaptainTradeTargetActions({
  onCancel,
}: {
  onCancel: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <CaptainTradeSwapButton
        selected
        disabled
        onClick={() => undefined}
        onConfirm={() => undefined}
        onCancel={onCancel}
      />
      <button
        type="button"
        aria-label="Cancel trade target"
        className={`${confirmCancelActionsClass} text-[var(--draft-text-medium)] hover:bg-[var(--draft-hover)] hover:text-[var(--draft-text-high)]`}
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
    </div>
  );
}

export function CaptainTradeResponseActions({
  isPendingAccept,
  isPendingReject,
  onAccept,
  onReject,
  onConfirm,
  onCancel,
}: {
  isPendingAccept: boolean;
  isPendingReject: boolean;
  onAccept: () => void;
  onReject: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (isPendingAccept || isPendingReject) {
    return (
      <CaptainConfirmCancelActions
        cancelLabel="Cancel trade response"
        confirmLabel={isPendingAccept ? "Confirm accept trade" : "Confirm reject trade"}
        confirmClassName={
          isPendingAccept
            ? "bg-green-700 text-white hover:bg-green-600"
            : "bg-red-700 text-white hover:bg-red-600"
        }
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Reject trade"
        className={`${confirmCancelActionsClass} border border-[var(--draft-divider)] text-[var(--draft-text-medium)] hover:bg-red-950/40 hover:text-red-300`}
        onClick={onReject}
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
        aria-label="Accept trade"
        className={`${confirmCancelActionsClass} bg-green-700 text-white hover:bg-green-600`}
        onClick={onAccept}
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

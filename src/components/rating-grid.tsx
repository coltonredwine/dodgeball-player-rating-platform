"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { METRIC_FIELDS, METRIC_HELP, MetricField } from "@/lib/constants";
import { MetricHelpButton } from "@/components/metric-help-button";

type PlayerRow = {
  playerId: string;
  firstName: string;
  lastName: string;
  link: string | null;
  power: number | null;
  accuracy: number | null;
  intimidation: number | null;
  catching: number | null;
  evasion: number | null;
  nerve: number | null;
  unknownPlayer: boolean;
};

type Props = {
  submissionId: string;
  locked: boolean;
  initialRows: PlayerRow[];
};

type ConfettiPiece = {
  id: string;
  centerOffset: string;
  drift: string;
  delay: string;
  duration: string;
  startRotate: string;
  endRotate: string;
  color: string;
};

const STORAGE_PREFIX = "player-scores-pending-";

const MOBILE_METRIC_TH_CLASS =
  "relative w-[1.65rem] max-w-[1.65rem] p-0 align-bottom sm:w-auto sm:max-w-none sm:p-2 sm:align-middle";

const MOBILE_METRIC_TD_CLASS = "w-[1.65rem] max-w-[1.65rem] px-0 py-1.5 sm:w-auto sm:max-w-none sm:px-2 sm:py-2";

function MobileRotatedHeader({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  return (
    <div className="flex w-full flex-col items-center justify-end gap-0.5 overflow-hidden py-1 sm:hidden">
      <span className="text-[9px] capitalize leading-none text-zinc-900 [writing-mode:vertical-rl]">
        {label}
      </span>
      {description ? (
        <MetricHelpButton label={label} description={description} compact />
      ) : null}
    </div>
  );
}

function isValidScore(value: number | null): value is number {
  return value !== null && value >= 1 && value <= 7;
}

function mergePlayerMetadata(stored: PlayerRow[], initial: PlayerRow[]) {
  const meta = new Map(initial.map((row) => [row.playerId, row]));
  return stored.map((row) => {
    const source = meta.get(row.playerId);
    return {
      ...row,
      firstName: source?.firstName ?? row.firstName,
      lastName: source?.lastName ?? row.lastName,
      link: source?.link ?? row.link ?? null,
    };
  });
}

function PlayerName({ row }: { row: PlayerRow }) {
  const label = `${row.firstName} ${row.lastName}`;
  if (row.link) {
    return (
      <a
        href={row.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block truncate text-blue-800 underline decoration-blue-800/40 underline-offset-2 hover:text-blue-950"
      >
        {label}
      </a>
    );
  }
  return <>{label}</>;
}

function isRowComplete(row: PlayerRow) {
  if (row.unknownPlayer) return true;
  return METRIC_FIELDS.every((field) => isValidScore(row[field]));
}

function rowHasPartialScores(row: PlayerRow) {
  if (row.unknownPlayer || isRowComplete(row)) return false;
  return METRIC_FIELDS.some((field) => row[field] !== null);
}

function parseScoreInput(raw: string): number | null {
  const cleaned = raw.replace(/\D/g, "").slice(0, 1);
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (value < 1 || value > 7) return null;
  return value;
}

export function RatingGrid({ submissionId, locked, initialRows }: Props) {
  const storageKey = `${STORAGE_PREFIX}${submissionId}`;
  const [rows, setRows] = useState<PlayerRow[]>(() => {
    if (typeof window === "undefined") return initialRows;
    const pending = window.localStorage.getItem(storageKey);
    if (!pending) return initialRows;
    try {
      const parsed = JSON.parse(pending) as PlayerRow[];
      return Array.isArray(parsed) ? mergePlayerMetadata(parsed, initialRows) : initialRows;
    } catch {
      return initialRows;
    }
  });
  const [status, setStatus] = useState("Saved");
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const incompleteCount = useMemo(
    () => rows.filter((row) => !isRowComplete(row)).length,
    [rows],
  );
  const allComplete = incompleteCount === 0;
  const hasPending = useMemo(
    () => rows.some((row) => row.unknownPlayer || METRIC_FIELDS.some((field) => row[field] !== null)),
    [rows],
  );
  const persistRows = useCallback(
    (next: PlayerRow[]) => {
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const sync = useCallback(
    async (saveRows: PlayerRow[], finalSubmit = false) => {
      if (locked) return false;
      try {
        setStatus(finalSubmit ? "Submitting..." : "Saving...");
        const response = await fetch(
          finalSubmit ? "/api/ratings/submit" : "/api/ratings/autosave",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionId, rows: saveRows }),
          },
        );
        if (!response.ok) {
          setStatus("Save failed, retrying later");
          persistRows(saveRows);
          return false;
        }
        setStatus(finalSubmit ? "Submitted" : `Saved ${new Date().toLocaleTimeString()}`);
        localStorage.removeItem(storageKey);
        return true;
      } catch {
        setStatus("Offline, pending sync");
        persistRows(saveRows);
        return false;
      }
    },
    [locked, persistRows, submissionId, storageKey],
  );

  useEffect(() => {
    if (locked) return;
    const interval = setInterval(() => {
      void sync(rows, false);
    }, 20_000);
    return () => clearInterval(interval);
  }, [rows, locked, sync]);

  const focusCell = useCallback((rowIndex: number, metricIndex: number) => {
    const row = Math.max(0, Math.min(rows.length - 1, rowIndex));
    const col = Math.max(0, Math.min(METRIC_FIELDS.length - 1, metricIndex));
    const input = inputRefs.current[row]?.[col];
    if (!input || input.disabled) return;
    input.focus();
    input.select();
  }, [rows.length]);

  function updateMetric(rowIndex: number, metric: MetricField, raw: string) {
    const score = parseScoreInput(raw);
    setRows((current) => {
      const next = [...current];
      next[rowIndex] = { ...next[rowIndex], [metric]: score };
      persistRows(next);
      return next;
    });
  }

  function toggleUnknown(rowIndex: number, checked: boolean) {
    setRows((current) => {
      const next = [...current];
      const row = { ...next[rowIndex], unknownPlayer: checked };
      if (checked) {
        for (const metric of METRIC_FIELDS) {
          row[metric] = null;
        }
      }
      next[rowIndex] = row;
      persistRows(next);
      return next;
    });
  }

  function handleMetricKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    metricIndex: number,
  ) {
    const key = event.key;
    if (key === "ArrowRight") {
      event.preventDefault();
      focusCell(rowIndex, metricIndex + 1);
      return;
    }
    if (key === "ArrowLeft") {
      event.preventDefault();
      focusCell(rowIndex, metricIndex - 1);
      return;
    }
    if (key === "ArrowDown") {
      event.preventDefault();
      focusCell(rowIndex + 1, metricIndex);
      return;
    }
    if (key === "ArrowUp") {
      event.preventDefault();
      focusCell(rowIndex - 1, metricIndex);
    }
  }

  async function handleSubmit() {
    if (locked) return;
    if (!allComplete) {
      setShowIncompleteWarning(true);
      return;
    }
    const submitted = await sync(rows, true);
    if (submitted) {
      const colors = [
        "#ef4444",
        "#f97316",
        "#f59e0b",
        "#eab308",
        "#84cc16",
        "#22c55e",
        "#14b8a6",
        "#06b6d4",
        "#3b82f6",
        "#6366f1",
        "#8b5cf6",
        "#d946ef",
        "#ec4899",
      ];
      const pieces = Array.from({ length: 110 }, (_, index) => ({
        id: `${Date.now()}-${index}`,
        centerOffset: `${(Math.random() - 0.5) * 30}%`,
        drift: `${(Math.random() - 0.5) * 85}vw`,
        delay: `${Math.random() * 1.3}s`,
        duration: `${3.8 + Math.random() * 1.6}s`,
        startRotate: `${Math.random() * 540 - 270}deg`,
        endRotate: `${(Math.random() < 0.5 ? -1 : 1) * (1200 + Math.random() * 1900)}deg`,
        color: colors[index % colors.length],
      }));
      setConfettiPieces(pieces);
      window.setTimeout(() => {
        setConfettiPieces([]);
      }, 9000);
    }
  }

  function setInputRef(rowIndex: number, metricIndex: number) {
    return (element: HTMLInputElement | null) => {
      if (!inputRefs.current[rowIndex]) {
        inputRefs.current[rowIndex] = [];
      }
      inputRefs.current[rowIndex][metricIndex] = element;
    };
  }

  return (
    <div className="min-w-0 space-y-3 text-zinc-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-600">
          <p>{status}</p>
          {!allComplete && !locked && (
            <p className="text-amber-700">
              {incompleteCount} player{incompleteCount === 1 ? "" : "s"} still need all 6 scores or
              &quot;I don&apos;t know this player&quot;.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={locked || !hasPending}
            onClick={() => void sync(rows, false)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            Save now
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => void handleSubmit()}
            className={`rounded px-3 py-2 text-sm text-white transition ${
              allComplete
                ? "bg-green-600 shadow-[0_0_18px_rgba(34,197,94,0.7)] hover:bg-green-500"
                : "bg-zinc-900 hover:bg-zinc-800"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Submit
          </button>
        </div>
      </div>

      {confettiPieces.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="confetti-piece absolute top-[-10px] h-3 w-2 rounded-[1px]"
              style={{
                left: `calc(50% + ${piece.centerOffset})`,
                backgroundColor: piece.color,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                ["--drift-x" as string]: piece.drift,
                ["--start-rot" as string]: piece.startRotate,
                ["--end-rot" as string]: piece.endRotate,
              }}
            />
          ))}
        </div>
      )}

      {showIncompleteWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="incomplete-title"
        >
          <div className="max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 id="incomplete-title" className="text-lg font-semibold">
              Complete all players first
            </h2>
            <p className="mt-2 text-sm text-zinc-700">
              Every row must have all six scores (1–7) entered, or be marked as &quot;I don&apos;t
              know this player&quot; before you can submit.
            </p>
            <p className="mt-2 text-sm font-medium text-amber-800">
              {incompleteCount} player{incompleteCount === 1 ? "" : "s"} still incomplete.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded bg-zinc-900 px-4 py-2 text-sm text-white"
              onClick={() => setShowIncompleteWarning(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="max-h-[75vh] w-full min-w-0 overflow-auto rounded border border-zinc-200">
        <table className="w-full table-fixed border-collapse text-sm sm:table-auto sm:min-w-full">
          <colgroup className="sm:hidden">
            <col className="w-[26%]" />
            {METRIC_FIELDS.map((field) => (
              <col key={field} className="w-[10%]" />
            ))}
            <col className="w-[14%]" />
          </colgroup>
          <thead className="sticky top-0 z-20 bg-zinc-100 text-zinc-900">
            <tr>
              <th className="sticky left-0 z-30 w-[26%] bg-zinc-100 px-1 py-2 text-left text-xs text-zinc-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] sm:w-auto sm:px-3 sm:text-sm">
                Player
              </th>
              {METRIC_FIELDS.map((field) => (
                <th key={field} className={`${MOBILE_METRIC_TH_CLASS} text-zinc-900`}>
                  <MobileRotatedHeader label={field} description={METRIC_HELP[field]} />
                  <div className="hidden items-center justify-start sm:flex">
                    <span>{field}</span>
                    <MetricHelpButton label={field} description={METRIC_HELP[field]} />
                  </div>
                </th>
              ))}
              <th className={`${MOBILE_METRIC_TH_CLASS} text-zinc-900`}>
                <MobileRotatedHeader label="Unknown" />
                <span className="hidden sm:inline">I don&apos;t know</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const complete = isRowComplete(row);
              const partial = rowHasPartialScores(row);
              const rowBg = complete ? "bg-[#dfe8df]" : "bg-white";
              return (
                <tr
                  key={row.playerId}
                  className={`border-t border-zinc-200 ${rowBg} ${
                    complete ? "text-zinc-600" : ""
                  }`}
                >
                  <td
                    className={`sticky left-0 z-10 w-[26%] px-1 py-1.5 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] sm:w-auto sm:px-3 sm:py-2 ${rowBg}`}
                  >
                    <span
                      className="block truncate text-[11px] leading-tight sm:max-w-none sm:text-sm"
                      title={`${row.firstName} ${row.lastName}`}
                    >
                      <PlayerName row={row} />
                    </span>
                  </td>
                  {METRIC_FIELDS.map((metric, metricIndex) => {
                    const highlightEmpty =
                      partial && row[metric] === null && !row.unknownPlayer && !locked;
                    return (
                    <td className={MOBILE_METRIC_TD_CLASS} key={metric}>
                      <input
                        ref={setInputRef(rowIndex, metricIndex)}
                        type="text"
                        inputMode="numeric"
                        pattern="[1-7]"
                        maxLength={1}
                        autoComplete="off"
                        disabled={locked || row.unknownPlayer}
                        value={row[metric] ?? ""}
                        onChange={(event) => updateMetric(rowIndex, metric, event.target.value)}
                        onKeyDown={(event) => handleMetricKeyDown(event, rowIndex, metricIndex)}
                        className={`box-border w-full max-w-[1.45rem] rounded border px-0 py-1.5 text-center text-sm disabled:bg-zinc-100 sm:max-w-none sm:w-12 sm:px-1 sm:py-2 sm:text-base ${
                          highlightEmpty
                            ? "border-amber-200 bg-amber-50"
                            : "border-zinc-300 bg-white"
                        }`}
                        aria-label={`${row.firstName} ${row.lastName} ${metric}`}
                      />
                    </td>
                  );
                  })}
                  <td className={`${MOBILE_METRIC_TD_CLASS} text-center sm:px-3`}>
                    <input
                      type="checkbox"
                      className="mx-auto h-4 w-4 sm:h-5 sm:w-5"
                      checked={row.unknownPlayer}
                      disabled={locked}
                      onChange={(event) => toggleUnknown(rowIndex, event.target.checked)}
                      aria-label={`I don't know ${row.firstName} ${row.lastName}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

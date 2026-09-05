"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  COLLECTION_STATUS_OPTIONS,
  formatTimestamp,
} from "@/lib/collection";
import { leaguePath } from "@/lib/league-path";
import type { CollectionStatus } from "@prisma/client";

export type CompletionViewRow = {
  raterId: string;
  raterName: string;
  submissionId: string | null;
  collectionStatus: CollectionStatus;
  collectionStatusAt: string | null;
  adminLocked: boolean;
  statusLabel: string;
  isFullyComplete: boolean;
  hasAnySavedRows: boolean;
  lastActivityAt: string | null;
};

type Tally = {
  complete: number;
  incomplete: number;
  not_started: number;
};

type Props = {
  leagueSlug: string;
  rows: CompletionViewRow[];
  tally: Tally;
  canEditCollection: boolean;
  canManageActions: boolean;
};

type ActionTarget = CompletionViewRow | null;

export function CompletionView({
  leagueSlug,
  rows,
  tally,
  canEditCollection,
  canManageActions,
}: Props) {
  const router = useRouter();
  const [pendingRaterId, setPendingRaterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openMenuRaterId, setOpenMenuRaterId] = useState<string | null>(null);
  const [lockTarget, setLockTarget] = useState<ActionTarget>(null);
  const [resetTarget, setResetTarget] = useState<ActionTarget>(null);
  const [resetStep, setResetStep] = useState<1 | 2 | null>(null);
  const [resetAcknowledged, setResetAcknowledged] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRaterIdRef = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpenMenuRaterId(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function onCollectionChange(raterId: string, status: CollectionStatus) {
    setPendingRaterId(raterId);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/raters/${raterId}/collection-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setPendingRaterId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to update collection status");
      return;
    }

    router.refresh();
  }

  async function toggleLock() {
    if (!lockTarget) return;
    setPendingRaterId(lockTarget.raterId);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/raters/${lockTarget.raterId}/lock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: !lockTarget.adminLocked }),
    });

    setPendingRaterId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to update lock");
      return;
    }

    setLockTarget(null);
    router.refresh();
  }

  async function performReset() {
    if (!resetTarget) return;
    setPendingRaterId(resetTarget.raterId);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/raters/${resetTarget.raterId}/reset`, {
      method: "POST",
    });

    setPendingRaterId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to reset scores");
      return;
    }

    setResetTarget(null);
    setResetStep(null);
    setResetAcknowledged(false);
    setSuccess(`${resetTarget.raterName}'s scores were reset.`);
    router.refresh();
  }

  function startUpload(raterId: string) {
    uploadRaterIdRef.current = raterId;
    setOpenMenuRaterId(null);
    fileInputRef.current?.click();
  }

  async function onUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const raterId = uploadRaterIdRef.current;
    uploadRaterIdRef.current = null;
    if (!file || !raterId) return;

    setPendingRaterId(raterId);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch(`/api/admin/raters/${raterId}/upload-scores`, {
      method: "POST",
      body: formData,
    });

    setPendingRaterId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Upload failed");
      return;
    }

    const payload = (await response.json()) as { updatedCount?: number };
    setSuccess(`Imported scores for ${payload.updatedCount ?? 0} player(s).`);
    router.refresh();
  }

  function closeResetFlow() {
    setResetTarget(null);
    setResetStep(null);
    setResetAcknowledged(false);
  }

  return (
    <div className="min-w-0 space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="sr-only"
        onChange={(event) => void onUploadFile(event)}
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}

      <div className="min-w-0 w-full max-w-3xl overflow-x-auto rounded border border-zinc-200">
        <table className="w-full border-collapse text-xs table-auto">
          <thead className="bg-zinc-50 text-left text-zinc-700">
            <tr className="border-b border-zinc-200">
              <th className="px-2 py-1.5 font-medium">Rater</th>
              <th className="max-w-[9rem] px-2 py-1.5 font-medium sm:max-w-none">Status</th>
              <th className="px-2 py-1.5 font-medium">Preview</th>
              <th className="px-2 py-1.5 font-medium">Collection</th>
              <th className="w-8 px-1 py-1.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const collected = row.collectionStatus === "collected";
              const collectionMarkedAt = formatTimestamp(row.collectionStatusAt);
              const lastActivity = formatTimestamp(row.lastActivityAt);
              const menuOpen = openMenuRaterId === row.raterId;

              return (
                <tr
                  key={row.raterId}
                  className={`border-b border-zinc-100 last:border-b-0 ${
                    collected ? "bg-green-50" : ""
                  }`}
                >
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {row.raterName}
                      {row.adminLocked ? (
                        <span className="text-[10px] text-zinc-500" title="Locked">
                          🔒
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <div>
                      {row.isFullyComplete ? (
                        <span className="inline-flex items-center gap-1 font-medium capitalize">
                          Complete <span aria-hidden="true">✅</span>
                        </span>
                      ) : (
                        <span className="text-zinc-700">{row.statusLabel}</span>
                      )}
                    </div>
                    {lastActivity ? (
                      <p className="mt-0.5 text-[10px] text-zinc-500">Updated {lastActivity}</p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-zinc-400">No activity yet</p>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {row.hasAnySavedRows ? (
                      <Link
                        className="text-[11px] font-medium text-blue-700 underline hover:text-blue-900"
                        href={leaguePath(leagueSlug, `/backend/rater/${row.raterId}`)}
                      >
                        View scores
                      </Link>
                    ) : (
                      <span className="text-[11px] text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <div className="flex max-w-[10rem] flex-col gap-1 sm:max-w-[11rem]">
                      <select
                        className="w-full rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px] disabled:opacity-60"
                        value={row.collectionStatus}
                        disabled={!canEditCollection || pendingRaterId === row.raterId}
                        onChange={(event) =>
                          void onCollectionChange(
                            row.raterId,
                            event.target.value as CollectionStatus,
                          )
                        }
                      >
                        {COLLECTION_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {collectionMarkedAt && row.collectionStatus !== "not_collected" ? (
                        <span className="text-[10px] leading-tight text-zinc-500">
                          {collectionMarkedAt}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="relative w-8 px-1 py-1.5">
                    <div ref={menuOpen ? menuRef : undefined}>
                      <button
                        type="button"
                        className="rounded border border-zinc-300 px-2 py-0.5 text-sm leading-none text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        aria-label={`Actions for ${row.raterName}`}
                        aria-expanded={menuOpen}
                        disabled={pendingRaterId === row.raterId}
                        onClick={() =>
                          setOpenMenuRaterId((current) =>
                            current === row.raterId ? null : row.raterId,
                          )
                        }
                      >
                        …
                      </button>
                      {menuOpen ? (
                        <div className="absolute right-2 top-full z-20 mt-1 min-w-[9rem] rounded border border-zinc-200 bg-white py-1 shadow-lg">
                          <a
                            className={`block px-3 py-1.5 text-[11px] hover:bg-zinc-50 ${
                              row.hasAnySavedRows ? "text-zinc-900" : "pointer-events-none text-zinc-400"
                            }`}
                            href={
                              row.hasAnySavedRows
                                ? `/api/admin/export/rater/${row.raterId}`
                                : undefined
                            }
                            onClick={() => setOpenMenuRaterId(null)}
                          >
                            Download
                          </a>
                          {canManageActions ? (
                            <>
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left text-[11px] text-zinc-900 hover:bg-zinc-50"
                                onClick={() => startUpload(row.raterId)}
                              >
                                Upload
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left text-[11px] text-zinc-900 hover:bg-zinc-50"
                                onClick={() => {
                                  setOpenMenuRaterId(null);
                                  setLockTarget(row);
                                }}
                              >
                                {row.adminLocked ? "Unlock" : "Lock"}
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left text-[11px] text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setOpenMenuRaterId(null);
                                  setResetTarget(row);
                                  setResetStep(1);
                                  setResetAcknowledged(false);
                                }}
                              >
                                Reset
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 text-zinc-700">
            <tr>
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5 align-top">
                <p className="font-medium">Totals</p>
                <p className="mt-0.5">{tally.complete} complete</p>
                <p className="mt-0.5">{tally.incomplete} incomplete</p>
                <p className="mt-0.5">{tally.not_started} not started</p>
              </td>
              <td className="px-2 py-1.5" colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      <ConfirmDialog
        open={lockTarget !== null}
        title={lockTarget?.adminLocked ? "Unlock score sheet?" : "Lock score sheet?"}
        message={
          lockTarget?.adminLocked
            ? `${lockTarget.raterName} will be able to edit their scores again.`
            : `${lockTarget?.raterName ?? "This rater"} will not be able to edit their scores while locked.`
        }
        confirmLabel={lockTarget?.adminLocked ? "Unlock" : "Lock"}
        confirmClassName="bg-zinc-900"
        pending={pendingRaterId === lockTarget?.raterId}
        onCancel={() => setLockTarget(null)}
        onConfirm={() => void toggleLock()}
      />

      <ConfirmDialog
        open={resetTarget !== null && resetStep === 1}
        title="Reset scores?"
        message={`This will permanently erase all saved scores for ${resetTarget?.raterName ?? "this rater"}.`}
        confirmLabel="Continue"
        confirmClassName="bg-red-600"
        onCancel={closeResetFlow}
        onConfirm={() => setResetStep(2)}
      />

      <ConfirmDialog
        open={resetTarget !== null && resetStep === 2}
        title="Confirm reset"
        message="This cannot be undone."
        confirmLabel="Reset scores"
        confirmClassName="bg-red-600"
        confirmDisabled={!resetAcknowledged}
        pending={pendingRaterId === resetTarget?.raterId}
        onCancel={closeResetFlow}
        onConfirm={() => void performReset()}
      >
        <label className="mt-3 flex items-start gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={resetAcknowledged}
            onChange={(event) => setResetAcknowledged(event.target.checked)}
          />
          <span>
            I want to erase {resetTarget?.raterName}&apos;s saved scores so they start from
            scratch.
          </span>
        </label>
      </ConfirmDialog>
    </div>
  );
}

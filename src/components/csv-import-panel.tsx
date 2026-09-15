"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { leaguePath } from "@/lib/league-path";

type Props = {
  title: string;
  importAction: string;
  entity: "players" | "raters";
};

export function CsvImportPanel({ title, importAction, entity }: Props) {
  const pathname = usePathname();
  const leagueSlug = pathname?.split("/").filter(Boolean)[0] ?? "";
  const base = `/api/admin/csv/${entity}`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(importAction, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        details?: string[];
        ok?: boolean;
        updated?: number;
        created?: number;
        processed?: number;
        recognizedActiveColumn?: boolean;
        recognizedLinkColumn?: boolean;
        warnings?: string[];
      } | null;

      if (!response.ok) {
        const detail = payload?.details?.length ? ` ${payload.details.join("; ")}` : "";
        setError((payload?.error ?? "Upload failed") + detail);
        return;
      }

      if (entity === "players" && payload?.ok) {
        const warnings = payload.warnings ?? [];
        const parts = [
          `Processed ${payload.processed ?? 0} row(s)`,
          `updated ${payload.updated ?? 0}`,
          `created ${payload.created ?? 0}`,
        ];
        if (payload.recognizedActiveColumn === false) {
          parts.push("no Active/Register column detected (soft-replaced active roster)");
        }
        if (payload.recognizedLinkColumn === false) {
          parts.push("no Link/Picture Link column detected");
        }
        setMessage(`${parts.join("; ")}.`);
        if (warnings.length) {
          setError(`Warnings: ${warnings.slice(0, 8).join("; ")}${warnings.length > 8 ? "…" : ""}`);
        }
        window.setTimeout(() => {
          window.location.assign(leaguePath(leagueSlug || "league", "/backend"));
        }, 1800);
        return;
      }

      window.location.assign(leaguePath(leagueSlug || "league", "/backend"));
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="min-w-0 space-y-3 rounded border border-zinc-200 p-4"
      onSubmit={onSubmit}
      encType="multipart/form-data"
    >
      <h2 className="font-semibold">{title}</h2>
      {entity === "players" ? (
        <p className="text-xs text-zinc-600">
          Preferred columns: <code>First Name,Last Name,Link,Active</code>. Also accepts{" "}
          <code>Picture Link</code> and <code>Fall … Register</code> (Y/N). Empty link cells keep
          existing links.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
          href={`${base}?kind=current`}
        >
          Download current CSV
        </Link>
        <Link
          className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
          href={`${base}?kind=template`}
        >
          Download blank template
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept=".csv"
          required
          disabled={pending}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setFileName(file?.name ?? null);
          }}
        />
        <button
          type="button"
          className="rounded border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm hover:bg-zinc-100 disabled:opacity-60"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
        >
          Choose file
        </button>
        <span className="min-w-0 break-all text-sm text-zinc-600">{fileName ?? "No file selected"}</span>
      </div>
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="block rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {pending ? "Uploading…" : "Upload CSV"}
      </button>
    </form>
  );
}

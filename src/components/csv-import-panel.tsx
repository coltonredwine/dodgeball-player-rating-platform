"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  title: string;
  importAction: string;
  entity: "players" | "raters";
};

export function CsvImportPanel({ title, importAction, entity }: Props) {
  const base = `/api/admin/csv/${entity}`;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(importAction, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        redirect: "follow",
      });

      if (response.redirected) {
        window.location.assign(response.url);
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          details?: string[];
        } | null;
        const detail = payload?.details?.length
          ? ` ${payload.details.join("; ")}`
          : "";
        setError((payload?.error ?? "Upload failed") + detail);
        return;
      }

      window.location.assign("/backend");
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-3 rounded border border-zinc-200 p-4"
      onSubmit={onSubmit}
      encType="multipart/form-data"
    >
      <h2 className="font-semibold">{title}</h2>
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
      <input type="file" name="file" accept=".csv" required disabled={pending} />
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

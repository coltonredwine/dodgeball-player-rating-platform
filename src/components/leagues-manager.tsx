"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LeagueRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

type Props = {
  leagues: LeagueRow[];
};

export function LeaguesManager({ leagues: initialLeagues }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });

    setPending(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Failed to create league");
      return;
    }

    const payload = (await response.json()) as { league: LeagueRow };
    setMessage(
      `Created “${payload.league.name}”. Share login link /${payload.league.slug}/login`,
    );
    setName("");
    setSlug("");
    router.refresh();
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="min-w-0 overflow-x-auto rounded border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-700">
            <tr className="border-b border-zinc-200">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">League code</th>
              <th className="px-3 py-2 font-medium">Login URL</th>
            </tr>
          </thead>
          <tbody>
            {initialLeagues.map((league) => (
              <tr key={league.id} className="border-b border-zinc-100 last:border-b-0">
                <td className="px-3 py-2">{league.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{league.slug}</td>
                <td className="px-3 py-2 text-xs text-zinc-600">
                  <span className="font-mono">/{league.slug}/login</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="min-w-0 max-w-lg space-y-3 rounded border border-zinc-200 p-4"
        onSubmit={onSubmit}
      >
        <h2 className="font-semibold">Create league</h2>
        <p className="text-xs text-zinc-600">
          New leagues start empty — no players, raters, or scores are copied.
        </p>
        <label className="block text-sm">
          Name
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="e.g. East Bay League"
          />
        </label>
        <label className="block text-sm">
          League code (slug)
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 font-mono text-sm"
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
            required
            placeholder="e.g. east-bay"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and hyphens only"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        <button
          className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50"
          type="submit"
          disabled={pending}
        >
          {pending ? "Creating…" : "Create league"}
        </button>
      </form>
    </div>
  );
}

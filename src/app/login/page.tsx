"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

/** Finder page: send people to their league login URL. */
export default function LoginFinderPage() {
  const [leagueSlug, setLeagueSlug] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = leagueSlug.trim().toLowerCase();
    if (!slug) {
      setError("Enter your league code");
      return;
    }
    router.push(`/${encodeURIComponent(slug)}/login`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Player Ratings</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your league code to continue to sign-in. Ask your admin if you don&apos;t know it.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          League code
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            type="text"
            required
            autoComplete="organization"
            placeholder="e.g. stonewall"
            value={leagueSlug}
            onChange={(e) => {
              setLeagueSlug(e.target.value);
              setError("");
            }}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="w-full rounded bg-zinc-900 px-4 py-2 text-white">
          Continue
        </button>
      </form>
      <p className="mt-4 text-xs text-zinc-500">
        Bookmark your league login, for example{" "}
        <span className="font-mono">/stonewall/login</span>.
      </p>
    </main>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, passcode }),
    });

    if (!response.ok) {
      const text = await response.text();
      let message = "Login failed";
      if (text) {
        try {
          const data = JSON.parse(text) as { error?: string };
          message = data.error ?? message;
        } catch {
          message = text;
        }
      }
      setError(message);
      setLoading(false);
      return;
    }

    router.push("/rate");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Stonewall Ratings Login</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Sign in with your email and passcode to rate players.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          Email
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Passcode
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            type="password"
            required
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

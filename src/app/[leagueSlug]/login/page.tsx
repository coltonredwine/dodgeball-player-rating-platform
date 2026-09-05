import { notFound } from "next/navigation";
import { findLeagueBySlug, normalizeLeagueSlug } from "@/lib/league";
import { LeagueLoginForm } from "@/components/league-login-form";

export default async function LeagueLoginPage({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}) {
  const { leagueSlug: rawSlug } = await params;
  const slug = normalizeLeagueSlug(rawSlug);
  const league = await findLeagueBySlug(slug);
  if (!league) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">{league.name}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Sign in with your email and passcode to rate players.
      </p>
      <LeagueLoginForm leagueSlug={league.slug} />
    </main>
  );
}

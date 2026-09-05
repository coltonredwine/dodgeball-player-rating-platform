import { notFound, redirect } from "next/navigation";
import { resolveSession, type AppSession } from "@/lib/auth";
import { findLeagueBySlug, getLeagueById, normalizeLeagueSlug } from "@/lib/league";
import { leaguePath, stripLeaguePrefix } from "@/lib/league-path";

export { leaguePath, stripLeaguePrefix };

/** Ensure the URL slug is a real league and matches the logged-in session. */
export async function requireLeaguePageSession(rawSlug: string): Promise<{
  session: AppSession;
  league: { id: string; name: string; slug: string };
}> {
  const slug = normalizeLeagueSlug(rawSlug);
  const league = await findLeagueBySlug(slug);
  if (!league) notFound();

  const session = await resolveSession();
  if (!session) {
    redirect(leaguePath(league.slug, "/login"));
  }

  if (session.leagueId !== league.id) {
    redirect(leaguePath(league.slug, "/login"));
  }

  return {
    session,
    league: { id: league.id, name: league.name, slug: league.slug },
  };
}

/** Public pages: league must exist; optional session must match if present. */
export async function requireLeagueFromSlug(rawSlug: string) {
  const slug = normalizeLeagueSlug(rawSlug);
  const league = await findLeagueBySlug(slug);
  if (!league) notFound();
  return { id: league.id, name: league.name, slug: league.slug };
}

export async function leagueSlugForSession(session: AppSession) {
  const league = await getLeagueById(session.leagueId);
  return league?.slug ?? null;
}

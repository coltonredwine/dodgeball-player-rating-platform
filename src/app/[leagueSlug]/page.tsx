import { redirect, notFound } from "next/navigation";
import { findLeagueBySlug, normalizeLeagueSlug } from "@/lib/league";
import { leaguePath } from "@/lib/league-routes";

/** `/stonewall` → `/stonewall/login` */
export default async function LeagueRootPage({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}) {
  const { leagueSlug: rawSlug } = await params;
  const slug = normalizeLeagueSlug(rawSlug);
  const league = await findLeagueBySlug(slug);
  if (!league) notFound();
  redirect(leaguePath(league.slug, "/login"));
}

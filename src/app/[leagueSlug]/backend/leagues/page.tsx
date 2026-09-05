import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { LeaguesManager } from "@/components/leagues-manager";
import { listLeagues } from "@/lib/league";
import { requireLeaguePageSession, leaguePath } from "@/lib/league-routes";
import { getAppNavData } from "@/lib/nav";
import { isSuperadmin } from "@/lib/rbac";

export default async function LeaguesPage({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}) {
  const { leagueSlug } = await params;
  const { session, league } = await requireLeaguePageSession(leagueSlug);
  if (!isSuperadmin(session)) redirect(leaguePath(league.slug, "/rate"));

  const [nav, leagues] = await Promise.all([getAppNavData(session), listLeagues()]);

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-7xl space-y-6 px-3 py-6 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Leagues</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Provision isolated leagues. Your current session is bound to the league code you used
              at login.
            </p>
          </div>
          <Link className="text-sm text-blue-700 underline" href={leaguePath(league.slug, "/backend/settings")}>
            ← Settings
          </Link>
        </div>

        <LeaguesManager
          leagues={leagues.map((entry) => ({
            id: entry.id,
            name: entry.name,
            slug: entry.slug,
            createdAt: entry.createdAt.toISOString(),
          }))}
        />
      </section>
    </main>
  );
}

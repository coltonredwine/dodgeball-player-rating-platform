import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { BuildDraftForm } from "@/components/build-draft-form";
import { prisma } from "@/lib/db";
import { requireLeaguePageSession, leaguePath } from "@/lib/league-routes";
import { getAppNavData } from "@/lib/nav";
import { isAdminLike } from "@/lib/rbac";

export default async function NewDraftPage({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}) {
  const { leagueSlug } = await params;
  const { session, league } = await requireLeaguePageSession(leagueSlug);
  if (!isAdminLike(session)) redirect(leaguePath(league.slug, "/rate"));

  const leagueId = session.leagueId;
  const [players, raters, nav] = await Promise.all([
    prisma.player.findMany({
      where: { leagueId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.rater.findMany({ where: { leagueId }, orderBy: { name: "asc" } }),
    getAppNavData(session),
  ]);

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-3xl space-y-4 px-3 py-6 sm:px-4">
        <Link className="text-sm text-blue-700 underline" href={leaguePath(league.slug, "/backend/drafts")}>
          ← Back to drafts
        </Link>
        <h1 className="text-2xl font-semibold">Build draft</h1>
        <BuildDraftForm leagueSlug={league.slug} players={players} raters={raters} />
      </section>
    </main>
  );
}

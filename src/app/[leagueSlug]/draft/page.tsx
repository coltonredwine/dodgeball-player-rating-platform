import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { getCaptainAssignmentsForRater } from "@/lib/draft/service";
import { requireLeaguePageSession, leaguePath } from "@/lib/league-routes";
import { getAppNavData } from "@/lib/nav";
import { isBackendUser, isManager } from "@/lib/rbac";

export default async function DraftHubPage({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}) {
  const { leagueSlug } = await params;
  const { session, league } = await requireLeaguePageSession(leagueSlug);

  if (isManager(session) || (isBackendUser(session) && !session.raterId)) {
    redirect(leaguePath(league.slug, "/backend/drafts"));
  }

  if (!session.raterId) {
    redirect(leaguePath(league.slug, "/rate"));
  }

  const assignments = await getCaptainAssignmentsForRater(session.raterId);
  if (assignments.length === 0) {
    redirect(leaguePath(league.slug, "/rate"));
  }

  if (assignments.length === 1) {
    redirect(leaguePath(league.slug, `/draft/${assignments[0].draftId}/pick`));
  }

  const nav = await getAppNavData(session);

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-7xl px-3 py-6 sm:px-4">
        <h1 className="text-2xl font-semibold">Draft</h1>
        <p className="mt-2 text-sm text-zinc-600">Choose a draft room to enter.</p>
        <ul className="mt-4 space-y-2">
          {assignments.map((assignment) => (
            <li key={assignment.draftId}>
              <Link
                href={leaguePath(league.slug, `/draft/${assignment.draftId}/pick`)}
                className="flex items-center justify-between rounded border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
              >
                <span className="font-medium">{assignment.draft.name}</span>
                <span className="text-sm text-zinc-500">
                  {assignment.draft.isLive ? "Live" : "Preview"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

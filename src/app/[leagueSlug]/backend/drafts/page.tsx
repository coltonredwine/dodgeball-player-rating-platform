import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { DraftListActions } from "@/components/draft-list-actions";
import { prisma } from "@/lib/db";
import { isDraftOpen } from "@/lib/draft/service";
import { requireLeaguePageSession, leaguePath } from "@/lib/league-routes";
import { getAppNavData } from "@/lib/nav";
import { canEditDrafts, isBackendUser } from "@/lib/rbac";

export default async function DraftsListPage({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}) {
  const { leagueSlug } = await params;
  const { session, league } = await requireLeaguePageSession(leagueSlug);
  if (!isBackendUser(session)) redirect(leaguePath(league.slug, "/rate"));

  const readOnly = !canEditDrafts(session);
  const leagueId = session.leagueId;

  const [drafts, nav] = await Promise.all([
    prisma.draft.findMany({
      where: {
        leagueId,
        ...(readOnly ? { status: { not: "complete" as const } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { players: true, picks: true } }, teams: { include: { rater: true } } },
    }),
    getAppNavData(session),
  ]);

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-7xl space-y-6 px-3 py-6 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Drafts</h1>
            {readOnly ? (
              <p className="mt-1 text-sm text-zinc-600">View-only access to open drafts.</p>
            ) : null}
          </div>
          {!readOnly ? (
            <Link
              href={leaguePath(league.slug, "/backend/drafts/new")}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Build draft
            </Link>
          ) : null}
        </div>
        <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
          {drafts.length === 0 ? (
            <li className="px-4 py-6 text-sm text-zinc-500">
              {readOnly ? "No open drafts." : "No drafts yet."}
            </li>
          ) : (
            drafts.map((draft) => (
              <li key={draft.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link
                    className="font-medium text-blue-700 underline"
                    href={leaguePath(league.slug, `/backend/drafts/${draft.id}`)}
                  >
                    {draft.name}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {draft.status} · {draft._count.players} players · {draft._count.picks} picks ·{" "}
                    {draft.isLive ? "Live" : "Not live"}
                    {readOnly && !isDraftOpen(draft) ? " · Closed" : ""}
                  </p>
                </div>
                <DraftListActions
                  leagueSlug={league.slug}
                  draftId={draft.id}
                  draftName={draft.name}
                  readOnly={readOnly}
                />
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}

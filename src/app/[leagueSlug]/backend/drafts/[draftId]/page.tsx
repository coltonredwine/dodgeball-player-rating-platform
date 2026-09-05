import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { DraftPageClient } from "@/components/draft-page-client";
import { prisma } from "@/lib/db";
import { isDraftOpen } from "@/lib/draft/service";
import { requireLeaguePageSession, leaguePath } from "@/lib/league-routes";
import { getAppNavData } from "@/lib/nav";
import { canEditDrafts, isBackendUser } from "@/lib/rbac";

export default async function DraftDashboardPage({
  params,
}: {
  params: Promise<{ leagueSlug: string; draftId: string }>;
}) {
  const { leagueSlug, draftId } = await params;
  const { session, league } = await requireLeaguePageSession(leagueSlug);
  if (!isBackendUser(session)) redirect(leaguePath(league.slug, "/rate"));

  const readOnly = !canEditDrafts(session);
  const [draft, nav] = await Promise.all([
    prisma.draft.findFirst({ where: { id: draftId, leagueId: session.leagueId } }),
    getAppNavData(session),
  ]);
  if (!draft) redirect(leaguePath(league.slug, "/backend/drafts"));
  if (readOnly && !isDraftOpen(draft)) redirect(leaguePath(league.slug, "/backend/drafts"));

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-7xl space-y-4 px-3 py-6 sm:px-4">
        {readOnly ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            View-only — you cannot change draft settings or make picks.
          </p>
        ) : null}
        <Suspense fallback={null}>
          <DraftPageClient
            leagueSlug={league.slug}
            draftId={draftId}
            draftName={draft.name}
            readOnly={readOnly}
          />
        </Suspense>
      </section>
    </main>
  );
}

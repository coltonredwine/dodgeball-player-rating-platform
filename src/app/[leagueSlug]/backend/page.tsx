import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { CompletionView } from "@/components/completion-view";
import { CsvImportPanel } from "@/components/csv-import-panel";
import { MarkForReviewPanel } from "@/components/mark-for-review-panel";
import { PlayersEditor } from "@/components/players-editor";
import { RatersEditor } from "@/components/raters-editor";
import { ScrollableListCard } from "@/components/scrollable-list-card";
import {
  formatProgressLabel,
  getCompletionCategory,
  getRaterProgress,
  tallyCompletionCategories,
} from "@/lib/completion";
import {
  getLastActivityAt,
  syncCollectedSubmissionsForNewPlayers,
} from "@/lib/collection";
import { prisma } from "@/lib/db";
import { requireLeaguePageSession, leaguePath } from "@/lib/league-routes";
import { getAppNavData } from "@/lib/nav";
import { isAdminLike, isBackendUser, isSuperadmin } from "@/lib/rbac";

export default async function BackendPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ importError?: string; importWarnings?: string }>;
}) {
  const { leagueSlug } = await params;
  const { session, league } = await requireLeaguePageSession(leagueSlug);
  if (!isBackendUser(session)) redirect(leaguePath(league.slug, "/rate"));

  const query = await searchParams;
  const importError = query.importError;
  const importWarnings = query.importWarnings;
  const leagueId = session.leagueId;

  const [players, raters] = await Promise.all([
    prisma.player.findMany({
      where: { leagueId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.rater.findMany({ where: { leagueId }, orderBy: { name: "asc" } }),
  ]);

  const activePlayersCount = players.filter((player) => player.active).length;
  const activePlayerIds = players.filter((player) => player.active).map((player) => player.id);
  await syncCollectedSubmissionsForNewPlayers(leagueId, activePlayersCount);

  const submissions = await prisma.ratingSubmission.findMany({
    where: { leagueId },
    include: { rater: true, ratings: true },
    orderBy: { updatedAt: "desc" },
  });

  const superadmin = isSuperadmin(session);
  const adminLike = isAdminLike(session);

  const latestSubmissionByRater = new Map<string, (typeof submissions)[number]>();
  for (const submission of submissions) {
    if (!latestSubmissionByRater.has(submission.raterId)) {
      latestSubmissionByRater.set(submission.raterId, submission);
    }
  }

  const completionRows = raters.map((rater) => {
    const latest = latestSubmissionByRater.get(rater.id);
    const progress = getRaterProgress(
      latest?.ratings ?? [],
      activePlayersCount,
      activePlayerIds,
    );

    return {
      raterId: rater.id,
      raterName: rater.name,
      submissionId: latest?.id ?? null,
      adminLocked: latest?.adminLocked ?? false,
      collectionStatus: latest?.collectionStatus ?? "not_collected",
      collectionStatusAt: latest?.collectionStatusAt?.toISOString() ?? null,
      statusLabel: formatProgressLabel(progress, activePlayersCount),
      isFullyComplete: progress.isFullyComplete,
      hasAnySavedRows: progress.hasAnySavedRows,
      lastActivityAt: getLastActivityAt(latest ?? null)?.toISOString() ?? null,
      category: getCompletionCategory(progress),
    };
  });

  const tally = tallyCompletionCategories(completionRows.map((row) => row.category));

  const nav = await getAppNavData(session);

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-7xl space-y-8 px-3 py-6 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <div className="flex flex-wrap gap-2">
            {superadmin ? (
              <Link
                href={leaguePath(league.slug, "/backend/settings")}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Settings
              </Link>
            ) : null}
            <Link
              href={leaguePath(league.slug, "/backend/drafts")}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Drafts
            </Link>
            <Link
              className="rounded border border-zinc-300 px-3 py-1 text-sm"
              href="/api/admin/export/all-raters"
            >
              Download all-raters CSV
            </Link>
          </div>
        </div>

        {superadmin ? <MarkForReviewPanel /> : null}

        {importError ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Import failed: {importError}
          </p>
        ) : null}
        {importWarnings ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Import finished with {importWarnings} row warning(s). Check your CSV and re-import if
            needed.
          </p>
        ) : null}

        <section className="min-w-0">
          <h2 className="text-lg font-semibold">Completion view</h2>
          <div className="mt-2">
            <CompletionView
              leagueSlug={league.slug}
              rows={completionRows.map(({ category: _category, ...row }) => row)}
              tally={tally}
              canEditCollection={adminLike}
              canManageActions={adminLike}
            />
          </div>
        </section>

        <section className="grid min-w-0 gap-6 md:grid-cols-2">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Players</h2>
            {adminLike ? (
              <div className="mt-2 min-w-0 space-y-4">
                <PlayersEditor
                  players={players.map((player) => ({
                    id: player.id,
                    firstName: player.firstName,
                    lastName: player.lastName,
                    link: player.link,
                    active: player.active,
                  }))}
                  permissions={{
                    canEditNames: superadmin,
                    canDelete: superadmin,
                  }}
                />
                {superadmin ? (
                  <CsvImportPanel
                    title="Import players CSV"
                    importAction="/api/admin/import/players"
                    entity="players"
                  />
                ) : null}
              </div>
            ) : (
              <ScrollableListCard title="Players">
                <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-100">
                  <tr>
                    <th className="px-3 py-2 text-left">First</th>
                    <th className="px-3 py-2 text-left">Last</th>
                    <th className="px-3 py-2 text-left">Link</th>
                    <th className="px-3 py-2 text-left">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => (
                    <tr key={player.id} className="border-t border-zinc-200">
                      <td className="px-3 py-2">{player.firstName}</td>
                      <td className="px-3 py-2">{player.lastName}</td>
                      <td className="px-3 py-2 text-zinc-600">{player.link ?? "—"}</td>
                      <td className="px-3 py-2">{player.active ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </ScrollableListCard>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Raters</h2>
            <div className="mt-2 min-w-0 space-y-4">
              <RatersEditor
                raters={raters.map((rater) => ({
                  id: rater.id,
                  name: rater.name,
                  email: rater.email,
                  role: rater.role,
                  passcodeDisplay: rater.passcodeDisplay,
                  active: rater.active,
                }))}
                permissions={{
                  viewerRole: session.role,
                  canEdit: adminLike,
                  canEditName: superadmin,
                  canEditRole: superadmin,
                  canEditActive: superadmin,
                  canDelete: superadmin,
                  canAdd: superadmin,
                }}
              />
              {superadmin ? (
                <CsvImportPanel
                  title="Import raters CSV"
                  importAction="/api/admin/import/raters"
                  entity="raters"
                />
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

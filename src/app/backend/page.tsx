import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { CsvImportPanel } from "@/components/csv-import-panel";
import { PlayersEditor } from "@/components/players-editor";
import { RatersEditor } from "@/components/raters-editor";
import { resolveSession } from "@/lib/auth";
import { formatProgressLabel, getRaterProgress } from "@/lib/completion";
import { prisma } from "@/lib/db";
import { getNavLinks } from "@/lib/nav";
import { isAdminLike, isBackendUser, isSuperadmin } from "@/lib/rbac";

export default async function BackendPage({
  searchParams,
}: {
  searchParams: Promise<{ importError?: string; importWarnings?: string }>;
}) {
  const session = await resolveSession();
  if (!session) redirect("/login");
  if (!isBackendUser(session)) redirect("/rate");

  const query = await searchParams;
  const importError = query.importError;
  const importWarnings = query.importWarnings;

  const [players, raters, submissions] = await Promise.all([
    prisma.player.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.rater.findMany({ orderBy: { name: "asc" } }),
    prisma.ratingSubmission.findMany({
      include: { rater: true, ratings: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const superadmin = isSuperadmin(session);
  const adminLike = isAdminLike(session);
  const activePlayersCount = players.filter((player) => player.active).length;
  const activePlayerIds = players.filter((player) => player.active).map((player) => player.id);
  const latestSubmissionByRater = new Map<string, (typeof submissions)[number]>();
  for (const submission of submissions) {
    if (!latestSubmissionByRater.has(submission.raterId)) {
      latestSubmissionByRater.set(submission.raterId, submission);
    }
  }

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav links={getNavLinks(session)} displayName={session.name || session.email} />
      <section className="mx-auto min-w-0 max-w-7xl space-y-8 px-3 py-6 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded border border-zinc-300 px-3 py-1 text-sm"
              href="/api/admin/export/all-raters"
            >
              Download all-raters CSV
            </Link>
          </div>
        </div>

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
          <div className="mt-2 min-w-0 overflow-x-auto rounded border border-zinc-200">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-zinc-50 text-left text-zinc-700">
                <tr className="border-b border-zinc-200">
                  <th className="px-2 py-1.5 font-medium">Rater</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5 font-medium">Preview</th>
                  <th className="px-2 py-1.5 font-medium">Export</th>
                </tr>
              </thead>
              <tbody>
                {raters.map((rater) => {
                  const latest = latestSubmissionByRater.get(rater.id);
                  const progress = getRaterProgress(
                    latest?.ratings ?? [],
                    activePlayersCount,
                    activePlayerIds,
                  );
                  const statusLabel = formatProgressLabel(progress, activePlayersCount);

                  return (
                    <tr key={rater.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-2 py-1.5 whitespace-nowrap">{rater.name}</td>
                      <td className="px-2 py-1.5">
                        {progress.isFullyComplete ? (
                          <span className="inline-flex items-center gap-1 font-medium capitalize">
                            Complete <span aria-hidden="true">✅</span>
                          </span>
                        ) : (
                          <span className="text-zinc-700">{statusLabel}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {progress.hasAnySavedRows ? (
                          <Link
                            className="text-[11px] font-medium text-blue-700 underline hover:text-blue-900"
                            href={`/backend/rater/${rater.id}`}
                          >
                            View scores
                          </Link>
                        ) : (
                          <span className="text-[11px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {progress.hasAnySavedRows ? (
                          <a
                            className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium text-white ${
                              progress.isFullyComplete
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-zinc-500 hover:bg-zinc-600"
                            }`}
                            href={`/api/admin/export/rater/${rater.id}`}
                          >
                            Download
                          </a>
                        ) : (
                          <span className="inline-block rounded bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                            Download
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
              <div className="mt-2 min-w-0 overflow-x-auto rounded border border-zinc-200">
                <table className="w-full border-collapse text-sm">
                <thead className="bg-zinc-100">
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
              </div>
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
